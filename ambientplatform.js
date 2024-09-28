'use strict'
//https://ambientweather.docs.apiary.io/#
//https://github.com/ambient-weather/api-docs/wiki/Device-Data-Specs

let io=require('socket.io-client')
let station=require('./devices/station')
let tempSensor=require('./devices/temp')
let aqinSensor=require('./devices/aqin')
let airSensor=require('./devices/air')
let leakSensor=require('./devices/leak')
let motionSensor=require('./devices/motion')
let occupancySensor=require('./devices/occupancy')

class ambientPlatform {
	constructor(log, config, api){
		this.station=new station(this, log)
		this.tempSensor=new tempSensor(this, log)
		this.aqinSensor=new aqinSensor(this, log)
		this.airSensor=new airSensor(this, log)
		this.leakSensor=new leakSensor(this, log)
		this.motionSensor=new motionSensor(this, log)
		this.occupancySensor=new occupancySensor(this, log)

		this.timeStamp=new Date()

		this.log=log
		this.config=config
		this.api_key=config.api_key
		this.api_app_key=config.api_app_key
		this.showOutdoor=config.showOutdoor
		this.showIndoor=config.showIndoor
		this.showAqin=config.showAqin
		this.showAirIn=config.showIndoorAir
		this.showAirOut=config.showOutdoorAir
		this.customSensor=config.sensors
		this.showOtherTemp=config.showOtherTemp
		this.showLeak=config.showLeak
		this.maxLeak=config.maxLeak ? config.maxLeak : 4
		this.maxTemp=config.maxtemp ? config.maxTemp : 8
		this.manufacturer=config.manufacturer ? config.manufacturer : "Ambient"
		this.weaterStation=config.station ? config.station : "WS4000"


		this.endpoint = 'https://rt2.ambientweather.net'
		this.accessories=[]
		this.weatherStation=null

		this.socketId

		this.locationAddress=config.locationAddress
		this.useFahrenheit=config.useFahrenheit ? config.useFahrenheit : true
		this.log.info('Starting Ambient platform using homebridge API', api.version)
		if(api){
			this.api=api
			this.api.on("didFinishLaunching", function (){
				this.connectAPI()
			}.bind(this))
		}
	}

	identify(){
		this.log.info('Identify ambient')
	}

	connectAPI(){
		let socket = io(this.endpoint,{
			reconnectionDelayMax: 10000,
			transports: ['websocket'],
			upgrade: true,
			auth: {
					token: "123abc"
				},
			query: {
					api: 1,
					applicationKey: this.api_app_key
				}
			}
		)
	  this.log.info("connecting")

	  socket.on("connect", () => {
		this.socketId=socket.id
		this.log.info('opened socket id', this.socketId)
		this.log.info('Connected to Ambient Weather')
		this.log.info('Subscribing to Ambient Weather Realtime API')
		socket.emit('subscribe', {apiKeys:[this.api_key]})
	  })
	  socket.on("disconnect", () => {
		this.log.info('closed socket id', this.socketId )
		this.log.info('Disconected from Ambient Weather')
		this.log.warn('%s Weather Station offline at %s! Sensors will show as non-responding in Homekit until the connection is restored.',this.weatherStation.displayName, new Date().toLocaleString())
		this.updatefault
		})

	  socket.on("subscribed", (data) => {
		//this.log.debug('subscribed',JSON.stringify(data,null,2));
		this.log.debug('Subscribed to %s device(s)',data.devices.length)
		data.devices.forEach((device)=>{
			this.log.success('Subscribed to Ambient Weather Realtime API updates for %s',device.info.name)
		})
		this.addAccessory(data.devices)
	  })

	  socket.on('data',(data) => {
		//this.log.debug('data',JSON.stringify(data,null,2))
		//this.log.debug('data recieved',data.date)
		/*
		//for testing
			data.temp1f=96.0
			data.batt1=1 //batt1...batt10 - OK/Low indication, Int, 1=OK, 0=Low (Meteobridge Users 1=Low, 0=OK)
			data.humidity1=30
			data.leak1=2
			data.batleak1=0 //batleak1...batleak4 - Leak Detector Battery - 1=Low 0=OK
			data.pm25=50
			data.batt_25=1
			data.pm25_in=100
		//for testing
		*/
		this.updateStatus(data)
	  })
	}

	addAccessory(devices){
		let uuid
		let name
		devices.forEach((device)=>{
			if(this.locationAddress==device.info.coords.address.split(',')[0] || this.locationAddress==null) {
				this.log('Found a match for configured location %s', device.info.coords.address.split(',')[0] )
				/*
				//for testing
					device.lastData.temp1f=69.0
					device.lastData.humidity1=20
					device.lastData.batt1=1
					device.lastData.leak1=0
					device.lastData.batleak1=0
					device.lastData.pm25=22
					device.lastData.batt_25=1
					device.lastData.pm25_in=80
				//for testing
				*/
				this.log.info('initial data from subscribed event',JSON.stringify(device.lastData,null,2));
				if(this.showOutdoor){
					uuid = UUIDGen.generate('station')
					if(!this.accessories[uuid]){
						this.log.debug('Registering platform accessory station')
						this.accessories[uuid]=this.station.createAccessory(device, uuid, this.accessories[uuid])
						this.api.registerPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
					}
				}
				else{
					uuid = UUIDGen.generate('station')
					if(this.accessories[uuid]){
						this.log.debug('Removed cached device',device.id)
						this.api.unregisterPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
						delete this.accessories[uuid]
					}
				}

				if(this.showIndoor && device.lastData.tempinf){
					let name = 'indoor'
					uuid = UUIDGen.generate(name)
					if(!this.accessories[uuid]){
						this.log.debug('Registering platform accessory temp')
						this.accessories[uuid]=this.tempSensor.createAccessory(device, uuid, this.accessories[uuid], name)
						this.api.registerPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
					}
				}
				else{
					if(this.showIndoor){
						this.log('Skipping indoor, sensor not found')
					}
					uuid = UUIDGen.generate('indoor')
					if(this.accessories[uuid]){
						this.log.debug('Removed cached device indoor', device.id)
						this.api.unregisterPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
						delete this.accessories[uuid]
					}
				}

				if(this.showOtherTemp){
					for (let index = 1; index <= this.maxTemp; index++) {
						name = 'temp'+index
						uuid = UUIDGen.generate(name)
						if(device.lastData[`temp${index}f`]){
							if(!this.accessories[uuid]){
								this.log.debug('Registering platform accessory temp%s', index)
								this.accessories[uuid]=this.tempSensor.createAccessory(device, uuid, this.accessories[uuid], name)
								this.api.registerPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
							}
						}
						else{
							this.log.debug('Skipping temp%s, sensor not found',index)
							if(this.accessories[uuid]){
								this.log.debug('Removed cached device temp%s', index)
								this.api.unregisterPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
								delete this.accessories[uuid]
							}
						}
					}
				}

				if(this.showLeak){
					for (let index = 1; index <= this.maxLeak; index++) {
						name = 'leak'+index
						uuid = UUIDGen.generate(name)
						if(device.lastData[`leak${index}`]!=null){
							if(!this.accessories[uuid]){
								this.log.debug('Registering platform accessory leak%s', index)
								this.accessories[uuid]=this.leakSensor.createAccessory(device, uuid, this.accessories[uuid], name)
								this.api.registerPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
							}
						}
						else{
							this.log.debug('Skipping leak%s, sensor not found',index)
							if(this.accessories[uuid]){
								this.log.debug('Removed cached device leak%s', index)
								this.api.unregisterPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
								delete this.accessories[uuid]
							}
						}
					}
				}

				if(this.showAqin && device.lastData.co2_in_aqin){
					uuid = UUIDGen.generate('aqin')
					if(!this.accessories[uuid]){
						this.log.debug('Registering platform accessory aqin')
						this.accessories[uuid]=this.aqinSensor.createAccessory(device, uuid, this.accessories[uuid])
						this.api.registerPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
					}
				}
				else{
					if(this.showAqin){
						this.log('Skipping aqin, sensor not found')
					}
					uuid = UUIDGen.generate('aqin')
					if(this.accessories[uuid]){
						this.log.debug('Removed cached device aqin', device.id)
						this.api.unregisterPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
						delete this.accessories[uuid]
					}
				}

				if(this.showAirIn && device.lastData.pm25_in){
					uuid = UUIDGen.generate('air_in')
					if(!this.accessories[uuid]){
						this.log.debug('Registering platform accessory indoor air')
						this.accessories[uuid]=this.airSensor.createAccessory(device, uuid, this.accessories[uuid],'in')
						this.api.registerPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
					}
				}
				else{
					if(this.showAirIn){
						this.log('Skipping indoor air sensor not found')
					}
					uuid = UUIDGen.generate('air_in')
					if(this.accessories[uuid]){
						this.log.debug('Removed cached device aqin', device.id)
						this.api.unregisterPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
						delete this.accessories[uuid]
					}
				}
				if(this.showAirOut && device.lastData.pm25){
					uuid = UUIDGen.generate('air_out')
					if(!this.accessories[uuid]){
						this.log.debug('Registering platform accessory outdoor air')
						this.accessories[uuid]=this.airSensor.createAccessory(device, uuid, this.accessories[uuid],'out')
						this.api.registerPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
					}
				}
				else{
					if(this.showAirOut){
						this.log('Skipping outdoor air sensor not found')
					}
					uuid = UUIDGen.generate('air_out')
					if(this.accessories[uuid]){
						this.log.debug('Removed cached device aqin', device.id)
						this.api.unregisterPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
						delete this.accessories[uuid]
					}
				}

				if(this.customSensor.length){
					this.customSensor.forEach((sensor)=>{
						if(device.lastData[sensor.dataPoint]!=null){
							uuid = UUIDGen.generate(sensor.name)
							if(this.accessories[uuid]){
								if((this.accessories[uuid].getService(Service.AccessoryInformation).getCharacteristic(Characteristic.ProductData).value == 'motion' && sensor.type==1)||
									(this.accessories[uuid].getService(Service.AccessoryInformation).getCharacteristic(Characteristic.ProductData).value == 'occupancy' && sensor.type==0)){
									this.log.warn('Changing sensor between Motion and Occupancy, check room assignments in Homekit')
									this.api.unregisterPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
									delete this.accessories[uuid]
								}
							}
							if(!this.accessories[uuid]){
								this.log.debug('Registering platform accessory')
								switch (sensor.type){
									case 0: this.accessories[uuid]=this.motionSensor.createAccessory(device, uuid, this.accessories[uuid],sensor); break
									case 1: this.accessories[uuid]=this.occupancySensor.createAccessory(device, uuid, this.accessories[uuid],sensor); break
								}
								this.api.registerPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
							}
						}
						else{
							this.log('Skipping sensor not found')
							uuid = UUIDGen.generate(sensor.name)
							if(this.accessories[uuid]){
								this.log.debug('Removed cached device',device.id)
								this.api.unregisterPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
								delete this.accessories[uuid]
							}
						}
					})
				}
			}
			else{
				this.log('Skipping location %s does not match configured location %s', device.info.coords.address.split(',')[0], this.locationAddress )
			}
			this.updateStatus(device.lastData)
		})
	}

	updateStatus(data){
		try{
			let tempSensor
			let humditySensor
			let leakSensor
			let airSensor
			let co2Sensor
			let batteryStatus
			let uuid
			if(this.showOutdoor){
				uuid = UUIDGen.generate('station')
				this.weatherStation=this.accessories[uuid]
				tempSensor=this.weatherStation.getService(Service.TemperatureSensor,)
				tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				tempSensor.getCharacteristic(Characteristic.CurrentTemperature).updateValue(((data.tempf- 32 + .01) * 5 / 9).toFixed(1))
				humditySensor=this.weatherStation.getService(Service.HumiditySensor)
				humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				humditySensor.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(data.humidity)
				//batteryStatus=this.weatherStation.getService(Service.Battery)
				//batteryStatus.getCharacteristic(Characteristic.StatusLowBattery).updateValue(!data.batt) // no outdoor battery
			}

			if(this.showIndoor && (data.tempinf)){
				uuid = UUIDGen.generate('indoor')
				this.weatherStation=this.accessories[uuid]
				tempSensor=this.weatherStation.getService(Service.TemperatureSensor,)
				tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				tempSensor.getCharacteristic(Characteristic.CurrentTemperature).updateValue(((data.tempinf- 32 + .01) * 5 / 9).toFixed(1))
				humditySensor=this.weatherStation.getService(Service.HumiditySensor)
				humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				humditySensor.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(data.humidityin)
				batteryStatus=this.weatherStation.getService(Service.Battery)
				batteryStatus.getCharacteristic(Characteristic.StatusLowBattery).updateValue(!data.battin)
			}

			for (let index = 1; index <= this.showOtherTemp; index++) {
				if(data[`temp${index}f`]!=null){
					uuid = UUIDGen.generate('temp'+index)
					this.weatherStation=this.accessories[uuid]
					tempSensor=this.weatherStation.getService(Service.TemperatureSensor,)
					tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
					tempSensor.getCharacteristic(Characteristic.CurrentTemperature).updateValue(((data[`temp${index}f`]- 32 + .01) * 5 / 9).toFixed(1))
					humditySensor=this.weatherStation.getService(Service.HumiditySensor)
					humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
					humditySensor.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(data[`humidity${index}`])
					batteryStatus=this.weatherStation.getService(Service.Battery)
					batteryStatus.getCharacteristic(Characteristic.StatusLowBattery).updateValue(!data[`batt${index}`])
				}
			}

			for (let index = 1; index <= this.showLeak; index++) {
				if(data[`leak${index}`]!=null){
					uuid = UUIDGen.generate('leak'+index)
					this.weatherStation=this.accessories[uuid]
					leakSensor=this.weatherStation.getService(Service.LeakSensor)
					if(data[`leak${index}`]==2){
						leakSensor.getCharacteristic(Characteristic.StatusActive).updateValue(false)
						leakSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
						batteryStatus=this.weatherStation.getService(Service.Battery)
						batteryStatus.getCharacteristic(Characteristic.StatusLowBattery).updateValue(data[`batleak${index}`])
					}
					else{
						leakSensor.getCharacteristic(Characteristic.StatusActive).updateValue(true)
						leakSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
						leakSensor.getCharacteristic(Characteristic.LeakDetected).updateValue(data[`leak${index}`])
						batteryStatus=this.weatherStation.getService(Service.Battery)
						batteryStatus.getCharacteristic(Characteristic.StatusLowBattery).updateValue(data[`batleak${index}`])
					}
				}
			}

			if(this.showAqin && data.co2_in_aqin){
				uuid = UUIDGen.generate('aqin')
				this.weatherStation=this.accessories[uuid]
				tempSensor=this.weatherStation.getService(Service.TemperatureSensor,)
				tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				tempSensor.getCharacteristic(Characteristic.CurrentTemperature).updateValue(((data.tempinf- 32 + .01) * 5 / 9).toFixed(1))

				humditySensor=this.weatherStation.getService(Service.HumiditySensor)
				humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				humditySensor.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(data.humidityin)
				airSensor=this.weatherStation.getService(Service.AirQualitySensor)

				airSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				airSensor.getCharacteristic(Characteristic.PM10Density).updateValue(data.pm10_in_aqin)
				airSensor.getCharacteristic(Characteristic.PM2_5Density).updateValue(data.pm25_in_aqin)

				if(data.aqi_pm25_aqin >300) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.POOR)}
				else if(data.aqi_pm25_aqin >200) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.POOR)}
				else if(data.aqi_pm25_aqin >150) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.INFERIOR)}
				else if(data.aqi_pm25_aqin >100) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.FAIR)}
				else if(data.aqi_pm25_aqin >50) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.GOOD)}
				else if(data.aqi_pm25_aqin >0) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.EXCELLENT)}
				else {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.UNKNOWN)}

				co2Sensor=this.weatherStation.getService(Service.CarbonDioxideSensor)
				co2Sensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				co2Sensor.getCharacteristic(Characteristic.CarbonDioxideLevel).updateValue(data.co2_in_aqin)
				co2Sensor.getCharacteristic(Characteristic.CarbonDioxidePeakLevel).updateValue(data.co2_in_24h_aqin)
				if(data.co2_in_aqin > 1200){
					co2Sensor.getCharacteristic(Characteristic.CarbonDioxideDetected).updateValue(Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL)
				}
				else{
					co2Sensor.getCharacteristic(Characteristic.CarbonDioxideDetected).updateValue(Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL)
				}

				batteryStatus=this.weatherStation.getService(Service.Battery)
				batteryStatus.getCharacteristic(Characteristic.StatusLowBattery).updateValue(!data.batt_co2)
			}
			if(this.showAirIn && data.pm25_in){
				uuid = UUIDGen.generate('air_in')
				this.weatherStation=this.accessories[uuid]
				airSensor=this.weatherStation.getService(Service.AirQualitySensor)
				airSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				airSensor.getCharacteristic(Characteristic.PM2_5Density).updateValue(data.pm25_in)

				if(data.pm25_in >300) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.POOR)}
				else if(data.pm25_in >200) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.POOR)}
				else if(data.pm25_in >150) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.INFERIOR)}
				else if(data.pm25_in >100) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.FAIR)}
				else if(data.pm25_in >50) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.GOOD)}
				else if(data.pm25_in >0) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.EXCELLENT)}
				else {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.UNKNOWN)}

				//batteryStatus=this.weatherStation.getService(Service.Battery)
				//batteryStatus.getCharacteristic(Characteristic.StatusLowBattery).updateValue(!data.batt_25_in)//check for batt
			}
			if(this.showAirOut && data.pm25){
				uuid = UUIDGen.generate('air_out')
				this.weatherStation=this.accessories[uuid]
				airSensor=this.weatherStation.getService(Service.AirQualitySensor)
				airSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				airSensor.getCharacteristic(Characteristic.PM2_5Density).updateValue(data.pm25)

				if(data.pm25 >300) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.POOR)}
				else if(data.pm25 >200) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.POOR)}
				else if(data.pm25 >150) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.INFERIOR)}
				else if(data.pm25 >100) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.FAIR)}
				else if(data.pm25 >50) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.GOOD)}
				else if(data.pm25 >0) {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.EXCELLENT)}
				else {airSensor.getCharacteristic(Characteristic.AirQuality).updateValue(Characteristic.AirQuality.UNKNOWN)}

				batteryStatus=this.weatherStation.getService(Service.Battery)
				batteryStatus.getCharacteristic(Characteristic.StatusLowBattery).updateValue(!data.batt_25 )
			}

			if(this.customSensor.length){
				this.customSensor.forEach((sensor)=>{
					if(data[sensor.dataPoint]!=null){
						let value = data[sensor.dataPoint]
						let motion = value>sensor.threshold ? true : false
						let sensorX
						uuid = UUIDGen.generate(sensor.name)
						this.weatherStation=this.accessories[uuid]
						switch (sensor.type){
							case 0:
								sensorX=this.weatherStation.getService(Service.MotionSensor)
								sensorX.getCharacteristic(Characteristic.MotionDetected).updateValue(motion)
								sensorX.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(value)
							break
							case 1:
								sensorX=this.weatherStation.getService(Service.OccupancySensor)
								sensorX.getCharacteristic(Characteristic.OccupancyDetected).updateValue(motion)
								sensorX.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(value)
							break
						}
					}
				})
			}
		}catch(err) {this.log.error('Error updating status %s', err)}
	}

	updatefault(){
		try{
			let tempSensor
			let humditySensor
			let leakSensor
			let airSensor
			let co2Sensor

			if(this.showOutdoor){
				uuid = UUIDGen.generate('station')
				this.weatherStation=this.accessories[uuid]
				tempSensor=this.weatherStation.getService(Service.TemperatureSensor)
				tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
				humditySensor=this.weatherStation.getService(Service.HumiditySensor)
				humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
			}

			if(this.showIndoor){
				uuid = UUIDGen.generate('indoor')
				this.indoor=this.accessories[uuid]
				tempSensor=this.indoor.getService(Service.TemperatureSensor)
				tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
				humditySensor=this.indoor.getService(Service.HumiditySensor)
				humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
			}

			for (let index = 1; index <= this.showOtherTemp; index++) {
				if(data[`temp${index}f`]!=null){
					uuid = UUIDGen.generate('temp'+index)
					this.weatherStation=this.accessories[uuid]
					tempSensor=this.weatherStation.getService(Service.TemperatureSensor,)
					tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
					humditySensor=this.indoor.getService(Service.HumiditySensor)
					humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
				}
			}

			for (let index = 1; index <= this.showLeak; index++) {
				if(data[`leak${index}`]!=null){
					uuid = UUIDGen.generate('leak'+index)
					this.weatherStation=this.accessories[uuid]
					leakSensor=this.weatherStation.getService(Service.LeakSensor)
					leakSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
				}
			}

			if(this.showAqin){
				uuid = UUIDGen.generate('aqin')
				this.aqin=this.accessories[uuid]
				tempSensor=this.indoor1.getService(Service.TemperatureSensor)
				tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
				humditySensor=this.indoor1.getService(Service.HumiditySensor)
				humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
				airSensor=this.weatherStation.getService(Service.AirQualitySensor)
				airSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
				co2Sensor=this.weatherStation.getService(Service.CarbonDioxideSensor)
				co2Sensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
			}

			if(this.showAirIn){
				uuid = UUIDGen.generate('air_in')
				this.aqin=this.accessories[uuid]
				airSensor=this.weatherStation.getService(Service.AirQualitySensor)
				airSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
			}

			if(this.showAirOut){
				uuid = UUIDGen.generate('air_out')
				this.aqin=this.accessories[uuid]
				airSensor=this.weatherStation.getService(Service.AirQualitySensor)
				airSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
			}

			if(this.customSensor.length){
				this.customSensor.forEach((sensor)=>{
					if(data[sensor.dataPoint]!=null){
						let sensorX
						uuid = UUIDGen.generate(sensor.name)
						this.weatherStation=this.accessories[uuid]
						switch (sensor.type){
							case 0:
								sensorX=this.weatherStation.getService(Service.MotionSensor)
								sensorX.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
							break
							case 1:
								sensorX=this.weatherStation.getService(Service.OccupancySensor)
								sensorX.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
							break
						}
					}
				})
			}

		}catch(err) {this.log.error('Error setting fault status')}
	}

  //**
  //** REQUIRED - Homebridge will call the "configureAccessory" method once for every cached accessory restored
  //**
  configureAccessory(accessory){
    // Added cached devices to the accessories array
    this.log.debug('Found cached accessory %s with %s', accessory.displayName, accessory.services)
    this.accessories[accessory.UUID]=accessory
  }
}
module.exports=ambientPlatform
