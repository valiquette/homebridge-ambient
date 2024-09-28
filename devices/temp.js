export default class temp {
	constructor(platform, log, api) {
		this.log = log
		this.platform = platform
		this.api = api
	}

	createAccessory(device, uuid, indoorSensor, name) {
		let index = name.substring(name.length-1)*1
		if(!Number.isInteger(index)){
			index='in'
		}

		let temp = ((device.lastData[`temp${index}f`]- 32 + .01) * 5 / 9).toFixed(1)
		let humdidity = device.lastData[`humidity${index}`]
		let batt = !device.lastData[`batt${index}`]  //1=OK, 0=Low

		if(!indoorSensor){
			this.log.info('Adding temp & humidity sensor for %s', device.info.name)
			indoorSensor = new this.api.platformAccessory(device.info.name, uuid)
		}
		else{
			this.log.debug('update Accessory %s temp & humidity sensor', device.info.name)
		}
		indoorSensor.getService(this.api.hap.Service.AccessoryInformation)
			.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name)
			.setCharacteristic(this.api.hap.Charateristic.Manufacturer, this.platform.manufacturer)
			.setCharacteristic(this.api.hap.Charateristic.SerialNumber, device.macAddress)
			.setCharacteristic(this.api.hap.Charateristic.Model, "WH32")

		let tempSensor=indoorSensor.getService(this.api.hap.Service.TemperatureSensor)
		if(!tempSensor){
			tempSensor = new this.api.hap.Service.TemperatureSensor(name)
			indoorSensor.addService(tempSensor)
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
				.setCharacteristic(this.api.hap.Charateristic.CurrentTemperature, temp)

		let humSensor=indoorSensor.getService(this.api.hap.Service.HumiditySensor)
		if(!humSensor){
			humSensor = new this.api.hap.Service.HumiditySensor(name)
			indoorSensor.addService(humSensor)
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
				.setCharacteristic(this.api.hap.Charateristic.CurrentRelativeHumidity, humdidity)

		let batteryStatus=indoorSensor.getService(this.api.hap.Service.Battery)
		if(!batteryStatus){
			batteryStatus = new this.api.hap.Service.Battery(name)
			indoorSensor.addService(batteryStatus)

			batteryStatus
				.getCharacteristic(this.api.hap.Charateristic.StatusLowBattery)
				.on('get', this.getStatusLowBattery.bind(this, batteryStatus))
		}
			batteryStatus
				.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name+' '+name)
				.setCharacteristic(this.api.hap.Charateristic.StatusLowBattery, batt)

		return indoorSensor
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