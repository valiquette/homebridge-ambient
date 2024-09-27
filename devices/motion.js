
class motion {
	constructor(platform, log) {
		this.log = log
		this.platform = platform
	}

	createAccessory(device, uuid, motionSensor, newSensor) {
		let value = device.lastData[newSensor.dataPoint]
		let motion = value>newSensor.threshold ? true : false

		if(!motionSensor){
			this.log.info('Adding custom sensor for %s', device.info.name)
			motionSensor = new PlatformAccessory(device.info.name, uuid)
		}
		else{
			this.log.debug('update Accessory %s custom sensor', device.info.name)
		}
		motionSensor.getService(Service.AccessoryInformation)
			.setCharacteristic(Characteristic.Name, device.info.name)
			.setCharacteristic(Characteristic.Manufacturer, "Ambient")
			.setCharacteristic(Characteristic.SerialNumber, device.macAddress)
			.setCharacteristic(Characteristic.Model, "WS")
			.setCharacteristic(Characteristic.ProductData, "motion")

		let sensor=motionSensor.getService(Service.MotionSensor)
		if(!sensor){
			sensor = new Service.MotionSensor(newSensor.name)
			motionSensor.addService(sensor)
			sensor.addCharacteristic(Characteristic.ConfiguredName)
			sensor.addCharacteristic(Characteristic.CurrentAmbientLightLevel)
			sensor.setCharacteristic(Characteristic.ConfiguredName, device.info.name+' '+newSensor.name)
			sensor
				.getCharacteristic(Characteristic.MotionDetected)
				.on('get', this.getStatusMotion.bind(this, sensor))
			}
			sensor
				.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
				.setProps({
					minValue: 0,
					maxValue: 10000
				})
			sensor
				.setCharacteristic(Characteristic.Name, device.info.name+' '+newSensor.name)
				.setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(Characteristic.MotionDetected, motion)
				.setCharacteristic(Characteristic.CurrentAmbientLightLevel, value)
		return motionSensor
	}

	getStatusMotion(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(Characteristic.StatusFault).value == Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(Characteristic.MotionDetected).value
			callback(null, currentValue)
		}
	}
}
module.exports = motion