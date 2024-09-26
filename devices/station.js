
class station {
	constructor(platform, log) {
		this.log = log
		this.platform = platform
	}

	createAccessory(device, uuid, weatherStation) {
		if(!weatherStation){
			this.log.info('Adding Outdoor sensors for %s', device.info.name)
			weatherStation = new PlatformAccessory(device.info.name, uuid)
		}
		else{
			this.log.debug('update Accessory %s station', device.info.name)
		}
		weatherStation.getService(Service.AccessoryInformation)
			.setCharacteristic(Characteristic.Name, device.info.name)
			.setCharacteristic(Characteristic.Manufacturer, "Ambient") //depracated ?
			.setCharacteristic(Characteristic.SerialNumber, device.macAddress) //depracated ?
			.setCharacteristic(Characteristic.Model, "WS-4000") //depracated ?

		let name ='Outdoor'

		let tempSensor=weatherStation.getService(Service.TemperatureSensor)
		if(!tempSensor){
			tempSensor = new Service.TemperatureSensor(name)
			weatherStation.addService(tempSensor)
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
				.setCharacteristic(Characteristic.CurrentTemperature, ((device.lastData.tempf- 32 + .01) * 5 / 9).toFixed(1))

		let humSensor=weatherStation.getService(Service.HumiditySensor)
		if(!humSensor){
			humSensor = new Service.HumiditySensor(name)
			weatherStation.addService(humSensor)
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
				.setCharacteristic(Characteristic.CurrentRelativeHumidity, device.lastData.humidity)

		let batteryStatus=weatherStation.getService(Service.Battery)
		if(!batteryStatus){
			batteryStatus = new Service.Battery(name)
			weatherStation.addService(batteryStatus)

			batteryStatus
				.getCharacteristic(Characteristic.StatusLowBattery)
				.on('get', this.getStatusLowBattery.bind(this, batteryStatus))
		}
			batteryStatus
				.setCharacteristic(Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL) //!device.lastData.batt

		return weatherStation
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
module.exports = station