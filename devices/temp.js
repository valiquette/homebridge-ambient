
class temp {
	constructor(platform, log) {
		this.log = log
		this.platform = platform
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
			indoorSensor = new PlatformAccessory(device.info.name, uuid)
		}
		else{
			this.log.debug('update Accessory %s temp & humidity sensor', device.info.name)
		}
		indoorSensor.getService(Service.AccessoryInformation)
			.setCharacteristic(Characteristic.Name, device.info.name)
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.SerialNumber, device.macAddress)
			.setCharacteristic(Characteristic.Model, "WH32")

		let tempSensor=indoorSensor.getService(Service.TemperatureSensor)
		if(!tempSensor){
			tempSensor = new Service.TemperatureSensor(name)
			indoorSensor.addService(tempSensor)
			tempSensor.addCharacteristic(Characteristic.ConfiguredName)
			tempSensor.setCharacteristic(Characteristic.ConfiguredName, device.info.name+' '+name)
			tempSensor
				.getCharacteristic(Characteristic.CurrentTemperature)
				.on('get', this.getStatusTemp.bind(this, tempSensor))
			}
			tempSensor
				.setCharacteristic(Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(Characteristic.CurrentTemperature, temp)

		let humSensor=indoorSensor.getService(Service.HumiditySensor)
		if(!humSensor){
			humSensor = new Service.HumiditySensor(name)
			indoorSensor.addService(humSensor)
			humSensor.addCharacteristic(Characteristic.ConfiguredName)
			humSensor.setCharacteristic(Characteristic.ConfiguredName, device.info.name+' '+name)
			humSensor
				.getCharacteristic(Characteristic.CurrentRelativeHumidity)
				.on('get', this.getStatusHum.bind(this, humSensor))
		}

			humSensor
				.setCharacteristic(Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(Characteristic.CurrentRelativeHumidity, humdidity)

		let batteryStatus=indoorSensor.getService(Service.Battery)
		if(!batteryStatus){
			batteryStatus = new Service.Battery(name)
			indoorSensor.addService(batteryStatus)

			batteryStatus
				.getCharacteristic(Characteristic.StatusLowBattery)
				.on('get', this.getStatusLowBattery.bind(this, batteryStatus))
		}
			batteryStatus
				.setCharacteristic(Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(Characteristic.StatusLowBattery, batt)

		return indoorSensor
	}

	getStatusTemp(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(Characteristic.StatusFault).value == Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(Characteristic.CurrentTemperature).value
			callback(null, currentValue)
		}
	}

	getStatusHum(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(Characteristic.StatusFault).value == Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(Characteristic.CurrentRelativeHumidity).value
			callback(null, currentValue)
		}
	}

	getStatusLowBattery(batteryStatus, callback) {
		try{
			let currentValue = batteryStatus.getCharacteristic(Characteristic.StatusLowBattery).value
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
module.exports = temp