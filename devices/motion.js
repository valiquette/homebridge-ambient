export default class motion {
	constructor(platform, log, api) {
		this.log = log
		this.platform = platform
		this.api = api
	}

	createAccessory(device, uuid, motionSensor, newSensor) {
		let value = device.lastData[newSensor.dataPoint]
		let motion = value>newSensor.threshold ? true : false

		if(!motionSensor){
			this.log.info('Adding custom sensor for %s', device.info.name)
			motionSensor = new this.api.platformAccessory(device.info.name, uuid)
		}
		else{
			this.log.debug('update Accessory %s custom sensor', device.info.name)
		}
		motionSensor.getService(this.api.hap.Service.AccessoryInformation)
			.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name)
			.setCharacteristic(this.api.hap.Charateristic.Manufacturer, this.platform.manufacturer)
			.setCharacteristic(this.api.hap.Charateristic.SerialNumber, device.macAddress)
			.setCharacteristic(this.api.hap.Charateristic.Model, "WS")
			.setCharacteristic(this.api.hap.Charateristic.ProductData, "motion")

		let sensor=motionSensor.getService(this.api.hap.Service.MotionSensor)
		if(!sensor){
			sensor = new this.api.hap.Service.MotionSensor(newSensor.name)
			motionSensor.addService(sensor)
			sensor.addCharacteristic(this.api.hap.Charateristic.ConfiguredName)
			sensor.addCharacteristic(this.api.hap.Charateristic.CurrentAmbientLightLevel)
			sensor.setCharacteristic(this.api.hap.Charateristic.ConfiguredName, device.info.name+' '+newSensor.name)
			sensor
				.getCharacteristic(this.api.hap.Charateristic.MotionDetected)
				.on('get', this.getStatusMotion.bind(this, sensor))
			}
			sensor
				.getCharacteristic(this.api.hap.Charateristic.CurrentAmbientLightLevel)
				.setProps({
					minValue: 0,
					maxValue: 10000
				})
			sensor
				.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name+' '+newSensor.name)
				.setCharacteristic(this.api.hap.Charateristic.StatusFault, this.api.hap.Charateristic.StatusFault.NO_FAULT)
				.setCharacteristic(this.api.hap.Charateristic.MotionDetected, motion)
				.setCharacteristic(this.api.hap.Charateristic.CurrentAmbientLightLevel, value)
		return motionSensor
	}

	getStatusMotion(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(this.api.hap.Charateristic.StatusFault).value == this.api.hap.Charateristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(this.api.hap.Charateristic.MotionDetected).value
			callback(null, currentValue)
		}
	}
}