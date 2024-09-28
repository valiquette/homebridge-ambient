export default class station {
	constructor(platform, log, api) {
		this.log = log
		this.platform = platform
		this.api = api
	}

	createAccessory(device, uuid, weatherStation) {
		if(!weatherStation){
			this.log.info('Adding Outdoor sensors for %s', device.info.name)
			weatherStation = new this.api.platformAccessory(device.info.name, uuid)
		}
		else{
			this.log.debug('update Accessory %s station', device.info.name)
		}
		weatherStation.getService(this.api.hap.Service.AccessoryInformation)
			.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name)
			.setCharacteristic(this.api.hap.Charateristic.Manufacturer,	this.platform.manufacturer)
			.setCharacteristic(this.api.hap.Charateristic.SerialNumber, device.macAddress)
			.setCharacteristic(this.api.hap.Charateristic.Model, this.weaterStation)

		let name ='Outdoor'

		let tempSensor=weatherStation.getService(this.api.hap.Service.TemperatureSensor)
		if(!tempSensor){
			tempSensor = new this.api.hap.Service.TemperatureSensor(name)
			weatherStation.addService(tempSensor)
			tempSensor.addCharacteristic(this.api.hap.Charateristic.ConfiguredName)
			tempSensor.setCharacteristic(this.api.hap.Charateristic.ConfiguredName, device.info.name+' '+name)
			tempSensor
				.getCharacteristic(this.api.hap.Charateristic.CurrentTemperature)
				.on('get', this.getStatusTemp.bind(this, tempSensor))
			}
			tempSensor
				.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name+' '+name)
				.setCharacteristic(this.api.hap.Charateristic.StatusFault, this.api.hap.Charateristic.StatusFault.NO_FAULT)
				.setCharacteristic(this.api.hap.Charateristic.StatusLowBattery, this.api.hap.Charateristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(this.api.hap.Charateristic.CurrentTemperature, ((device.lastData.tempf- 32 + .01) * 5 / 9).toFixed(1))

		let humSensor=weatherStation.getService(this.api.hap.Service.HumiditySensor)
		if(!humSensor){
			humSensor = new this.api.hap.Service.HumiditySensor(name)
			weatherStation.addService(humSensor)
			humSensor.addCharacteristic(this.api.hap.Charateristic.ConfiguredName)
			humSensor.setCharacteristic(this.api.hap.Charateristic.ConfiguredName, device.info.name+' '+name)
			humSensor
				.getCharacteristic(this.api.hap.Charateristic.CurrentRelativeHumidity)
				.on('get', this.getStatusHum.bind(this, humSensor))
		}

			humSensor
				.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name+' '+name)
				.setCharacteristic(this.api.hap.Charateristic.StatusFault, this.api.hap.Charateristic.StatusFault.NO_FAULT)
				.setCharacteristic(this.api.hap.Charateristic.StatusLowBattery, this.api.hap.Charateristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(this.api.hap.Charateristic.CurrentRelativeHumidity, device.lastData.humidity)

		let batteryStatus=weatherStation.getService(this.api.hap.Service.Battery)
		if(!batteryStatus){
			batteryStatus = new this.api.hap.Service.Battery(name)
			weatherStation.addService(batteryStatus)

			batteryStatus
				.getCharacteristic(this.api.hap.Charateristic.StatusLowBattery)
				.on('get', this.getStatusLowBattery.bind(this, batteryStatus))
		}
			batteryStatus
				.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name+' '+name)
				.setCharacteristic(this.api.hap.Charateristic.StatusLowBattery, this.api.hap.Charateristic.StatusLowBattery.BATTERY_LEVEL_NORMAL) //!device.lastData.batt

		return weatherStation
	}

	getStatusTemp(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(this.api.hap.Charateristic.StatusFault).value == this.api.hap.Charateristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(this.api.hap.Charateristic.CurrentTemperature).value
			callback(null, currentValue)
		}
	}

	getStatusHum(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(this.api.hap.Charateristic.StatusFault).value == this.api.hap.Charateristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(this.api.hap.Charateristic.CurrentRelativeHumidity).value
			callback(null, currentValue)
		}
	}

	getStatusLowBattery(batteryStatus, callback) {
		try{
			let currentValue = batteryStatus.getCharacteristic(this.api.hap.Charateristic.StatusLowBattery).value
			if (currentValue==1) {
				this.log.warn('Battery Status Low')
			}
			callback(null, currentValue)
		}catch (error) {
			this.log.error("caught low battery error")
			return
		}
	}

}