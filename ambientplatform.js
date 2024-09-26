'use strict'
//https://ambientweather.docs.apiary.io/#
//https://github.com/ambient-weather/api-docs/wiki/Device-Data-Specs

let io=require('socket.io-client')
let station=require('homebridge-ambient-realtime/devices/station')
let tempSensor=require('homebridge-ambient-realtime/devices/temp')
let airSensor=require('homebridge-ambient-realtime/devices/aqin')
let co2Sensor=require('homebridge-ambient-realtime/devices/co2')
let motionSensor=require('homebridge-ambient-realtime/devices/motion')
let occupancySensor=require('homebridge-ambient-realtime/devices/occupancy')

class ambientPlatform {
	constructor(log, config, api){
		this.station=new station(this, log)
		this.tempSensor=new tempSensor(this, log)
		this.airSensor=new airSensor(this, log)
		this.co2Sensor=new co2Sensor(this, log)
		this.motionSensor=new motionSensor(this, log)
		this.occupancySensor=new occupancySensor(this, log)

		this.timeStamp=new Date()

		this.log=log
		this.config=config
		this.api_key=config.api_key
		this.api_app_key=config.api_app_key
		this.showOutdoor=config.showOutdoor
		this.showIndoor=config.showIndoor
		//this.showIndoor1=config.showIndoor1
		//this.showIndoor2=config.showIndoor2
		//this.showIndoor3=config.showIndoor3
		this.showAqin=config.showAqin
		this.showCo2=config.showCo2
		this.showAir=config.showAir
		this.customSensor=config.sensors

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
		this.updateStatus(data)
	  })
	}

	addAccessory(devices){
		let uuid
		devices.forEach((device)=>{
			if(this.locationAddress==device.info.coords.address.split(',')[0] || this.locationAddress==null) {
				this.log('Found a match for configured location %s', device.info.coords.address.split(',')[0] )
				this.log.info('current data',JSON.stringify(device.lastData,null,2));
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
				//if(this.showIndoor1 && (device.lastData.tempinf || device.lastData.temp1inf)){
				if(this.showIndoor1 && device.lastData.tempinf){
					let name = 'indoor'
					uuid = UUIDGen.generate(name)
					if(!this.accessories[uuid]){
						this.log.debug('Registering platform accessory temp')
						this.accessories[uuid]=this.tempSensor.createAccessory(device, uuid, this.accessories[uuid], name)
						this.api.registerPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
					}
				}
				else{
					this.log('Skipping indoor, sensor not found')
					uuid = UUIDGen.generate('indoor')
					if(this.accessories[uuid]){
						this.log.debug('Removed cached device indoor',device.id)
						this.api.unregisterPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
						delete this.accessories[uuid]
					}
				}
				/*
				if(this.showIndoor2){
					if(device.lastData.temp2inf){
						let name = 'indoor2'
						uuid = UUIDGen.generate(name)
						if(!this.accessories[uuid]){
							this.log.debug('Registering platform accessory temp 2')
							this.accessories[uuid]=this.tempSensor.createAccessory(device, uuid, this.accessories[uuid], name)
							this.api.registerPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
						}
					}
				}
				else{
					this.log('Skipping indoor 2, sensor not found')
					uuid = UUIDGen.generate('indoor2')
					if(this.accessories[uuid]){
						this.log.debug('Removed cached device indoor2',device.id)
						this.api.unregisterPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
						delete this.accessories[uuid]
					}
				}
				if(this.showIndoor3){
					if(device.lastData.temp3inf){
						let name = 'indoor3'
						uuid = UUIDGen.generate(name)
						if(!this.accessories[uuid]){
							this.log.debug('Registering platform accessory temp 3')
							this.accessories[uuid]=this.tempSensor.createAccessory(device, uuid, this.accessories[uuid], name)
							this.api.registerPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
						}
					}
				}
				else{
					this.log('Skipping indoor 3, sensor not found')
					uuid = UUIDGen.generate('indoor3')
					if(this.accessories[uuid]){
						this.log.debug('Removed cached device indoor 3',device.id)
						this.api.unregisterPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
						delete this.accessories[uuid]
					}
				}
				*/
				if(this.showAqin && device.lastData.aqi_pm25_aqin){
					uuid = UUIDGen.generate('aqin')
					if(!this.accessories[uuid]){
						this.log.debug('Registering platform accessory aqin')
						this.accessories[uuid]=this.airSensor.createAccessory(device, uuid, this.accessories[uuid])
						this.api.registerPlatformAccessories(PluginName, PlatformName, [this.accessories[uuid]])
					}
				}
				else{
					this.log('Skipping aqin, sensor not found')
					uuid = UUIDGen.generate('aqin')
					if(this.accessories[uuid]){
						this.log.debug('Removed cached device aqin',device.id)
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
		})
	}

	updateStatus(data){
		try{
			let tempSensor
			let humditySensor
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
			if(this.showIndoor1 && (data.tempinf)){
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
			/*
			if(this.showIndoor2 && data.temp2inf){
				uuid = UUIDGen.generate('indoor2')
				this.weatherStation=this.accessories[uuid]
				tempSensor=this.weatherStation.getService(Service.TemperatureSensor,)
				tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				tempSensor.getCharacteristic(Characteristic.CurrentTemperature).updateValue(((data.temp2inf- 32 + .01) * 5 / 9).toFixed(1))
				humditySensor=this.weatherStation.getService(Service.HumiditySensor)
				humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				humditySensor.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(data.humidity2in)
				batteryStatus=this.weatherStation.getService(Service.Battery)
				batteryStatus.getCharacteristic(Characteristic.StatusLowBattery).updateValue(!data.batt2in)
			}
			if(this.showIndoor2 && data.temp3inf){
				uuid = UUIDGen.generate('indoor3')
				this.weatherStation=this.accessories[uuid]
				tempSensor=this.weatherStation.getService(Service.TemperatureSensor,)
				tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				tempSensor.getCharacteristic(Characteristic.CurrentTemperature).updateValue(((data.temp3inf- 32 + .01) * 5 / 9).toFixed(1))
				humditySensor=this.weatherStation.getService(Service.HumiditySensor)
				humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				humditySensor.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(data.humidity3in)
				batteryStatus=this.weatherStation.getService(Service.Battery)
				batteryStatus.getCharacteristic(Characteristic.StatusLowBattery).updateValue(!data.batt3in)
			}
			*/
			if(this.showAqin && data.pm_in_temp_aqin){
				uuid = UUIDGen.generate('aqin')
				this.weatherStation=this.accessories[uuid]
				tempSensor=this.weatherStation.getService(Service.TemperatureSensor,)
				tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				tempSensor.getCharacteristic(Characteristic.CurrentTemperature).updateValue(((data.tempinf- 32 + .01) * 5 / 9).toFixed(1))
				humditySensor=this.weatherStation.getService(Service.HumiditySensor)
				humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT)
				humditySensor.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(data.humidityin)
				batteryStatus=this.weatherStation.getService(Service.Battery)
				batteryStatus.getCharacteristic(Characteristic.StatusLowBattery).updateValue(!data.batt_co2)
			}
			if(this.showAir && data.aqi_pm25_aqin){
				uuid = UUIDGen.generate('aqin')
				this.weatherStation=this.accessories[uuid]
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

				batteryStatus=this.weatherStation.getService(Service.Battery)
				batteryStatus.getCharacteristic(Characteristic.StatusLowBattery).updateValue(!data.batt_co2)
			}
			if(this.showCo2 && data.co2_in_aqin){
				uuid = UUIDGen.generate('aqin')
				this.weatherStation=this.accessories[uuid]
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
				this.indoor1=this.accessories[uuid]
				tempSensor=this.indoor1.getService(Service.TemperatureSensor)
				tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
				humditySensor=this.indoor1.getService(Service.HumiditySensor)
				humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
			}
/*
			if(this.showIndoor2){
				uuid = UUIDGen.generate('indoor2')
				this.indoor1=this.accessories[uuid]
				tempSensor=this.indoor1.getService(Service.TemperatureSensor)
				tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
				humditySensor=this.indoor1.getService(Service.HumiditySensor)
				humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
			}

			if(this.showIndoor3){
				uuid = UUIDGen.generate('indoor3')
				this.indoor1=this.accessories[uuid]
				tempSensor=this.indoor1.getService(Service.TemperatureSensor)
				tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
				humditySensor=this.indoor1.getService(Service.HumiditySensor)
				humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
			}
*/
			if(this.showAqin){
				uuid = UUIDGen.generate('aqin')
				this.aqin=this.accessories[uuid]
				tempSensor=this.indoor1.getService(Service.TemperatureSensor)
				tempSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
				humditySensor=this.indoor1.getService(Service.HumiditySensor)
				humditySensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
			}

			if(this.showAir){
				uuid = UUIDGen.generate('aqin')
				this.aqin=this.accessories[uuid]
				airSensor=this.weatherStation.getService(Service.AirQualitySensor)
				airSensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
			}
			if(this.showCo2){
				uuid = UUIDGen.generate('aqin')
				this.aqin=this.accessories[uuid]
				co2Sensor=this.weatherStation.getService(Service.CarbonDioxideSensor)
				co2Sensor.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT)
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
