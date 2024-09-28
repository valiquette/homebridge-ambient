export default class leak {
	constructor(platform, log, api) {
		this.log = log
		this.platform = platform
		this.api = api
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
			waterSensor = new this.api.platformAccessory(device.info.name, uuid)
		}
		else{
			this.log.debug('update Accessory %s leak sensor', device.info.name)
		}
		waterSensor.getService(this.api.hap.Service.AccessoryInformation)
			.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name)
			.setCharacteristic(this.api.hap.Charateristic.Manufacturer,	this.platform.manufacturer)
			.setCharacteristic(this.api.hap.Charateristic.SerialNumber, device.macAddress)
			.setCharacteristic(this.api.hap.Charateristic.Model, "WH31LA")

		let leakSensor=waterSensor.getService(this.api.hap.Service.TemperatureSensor)
		if(!leakSensor){
			leakSensor = new this.api.hap.Service.LeakSensor(name)
			waterSensor.addService(leakSensor)
			leakSensor.addCharacteristic(this.api.hap.Charateristic.ConfiguredName)
			leakSensor.setCharacteristic(this.api.hap.Charateristic.ConfiguredName, device.info.name+' '+name)
			leakSensor
				.getCharacteristic(this.api.hap.Charateristic.LeakDetected)
				.on('get', this.getStatusLeak.bind(this, leakSensor))
		}
			leakSensor
				.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name+' '+name)
				.setCharacteristic(this.api.hap.Charateristic.StatusActive, active)
				.setCharacteristic(this.api.hap.Charateristic.StatusFault, this.api.hap.Charateristic.StatusFault.NO_FAULT)
				.setCharacteristic(this.api.hap.Charateristic.StatusLowBattery, this.api.hap.Charateristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(this.api.hap.Charateristic.LeakDetected, leak)

		let batteryStatus=waterSensor.getService(this.api.hap.Service.Battery)
		if(!batteryStatus){
			batteryStatus = new this.api.hap.Service.Battery(name)
			waterSensor.addService(batteryStatus)

			batteryStatus
				.getCharacteristic(this.api.hap.Charateristic.StatusLowBattery)
				.on('get', this.getStatusLowBattery.bind(this, batteryStatus))
		}
			batteryStatus
				.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name+' '+name)
				.setCharacteristic(this.api.hap.Charateristic.StatusLowBattery, batt)

		return waterSensor
	}

	getStatusLeak(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(this.api.hap.Charateristic.StatusFault).value == this.api.hap.Charateristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(this.api.hap.Charateristic.LeakDetected).value
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