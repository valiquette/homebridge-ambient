class leak {
	constructor(platform, log) {
		this.log = log
		this.platform = platform
	}

	createAccessory(device, uuid, waterSensor, name) {
		let index = name.substring(name.length-1)*1

		let leak = device.lastData[`leak${index}`]
		let active =true
		let batt = device.lastData[`batleak${index}`] //1=OK, 0=Low
		if(leak=2){
			active=false
			leak=0
		}

		if(!waterSensor){
			this.log.info('Adding leak sensor for %s', device.info.name)
			waterSensor = new PlatformAccessory(device.info.name, uuid)
		}
		else{
			this.log.debug('update Accessory %s leak sensor', device.info.name)
		}
		waterSensor.getService(Service.AccessoryInformation)
			.setCharacteristic(Characteristic.Name, device.info.name)
			.setCharacteristic(Characteristic.Manufacturer,	this.manufacturer)
			.setCharacteristic(Characteristic.SerialNumber, device.macAddress)
			.setCharacteristic(Characteristic.Model, "WH31LA")

		let leakSensor=waterSensor.getService(Service.TemperatureSensor)
		if(!leakSensor){
			leakSensor = new Service.LeakSensor(name)
			waterSensor.addService(leakSensor)
			leakSensor.addCharacteristic(Characteristic.ConfiguredName)
			leakSensor.setCharacteristic(Characteristic.ConfiguredName, device.info.name+' '+name)
			leakSensor
				.getCharacteristic(Characteristic.LeakDetected)
				.on('get', this.getStatusLeak.bind(this, leakSensor))
		}
			leakSensor
				.setCharacteristic(Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(Characteristic.StatusActive, active)
				.setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(Characteristic.LeakDetected, leak)

		let batteryStatus=waterSensor.getService(Service.Battery)
		if(!batteryStatus){
			batteryStatus = new Service.Battery(name)
			waterSensor.addService(batteryStatus)

			batteryStatus
				.getCharacteristic(Characteristic.StatusLowBattery)
				.on('get', this.getStatusLowBattery.bind(this, batteryStatus))
		}
			batteryStatus
				.setCharacteristic(Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(Characteristic.StatusLowBattery, batt)

		return waterSensor
	}

	getStatusLeak(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(Characteristic.StatusFault).value == Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(Characteristic.LeakDetected).value
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
module.exports = leak