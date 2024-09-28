
class occupancy {
	constructor(platform, log) {
		this.log = log
		this.platform = platform
	}

	createAccessory(device, uuid, occupancySensor, newSensor) {
		let value = device.lastData[newSensor.dataPoint]
		let occupancy = value>newSensor.threshold ? true : false

		if(!occupancySensor){
			this.log.info('Adding custom sensor for %s', device.info.name)
			occupancySensor = new PlatformAccessory(device.info.name, uuid)
		}
		else{
			this.log.debug('update Accessory %s custom sensor', device.info.name)
		}
		occupancySensor.getService(Service.AccessoryInformation)
			.setCharacteristic(Characteristic.Name, device.info.name)
			.setCharacteristic(Characteristic.Manufacturer,	this.manufacturer)
			.setCharacteristic(Characteristic.SerialNumber, device.macAddress)
			.setCharacteristic(Characteristic.Model, "WS")
			.setCharacteristic(Characteristic.ProductData, "occupancy")

		//let sensor=occupancySensor.getService(Service.occupancySensor)
		let sensor=occupancySensor.getService(Service.occupancySensor)
		if(!sensor){
			sensor = new Service.OccupancySensor(newSensor.name)
			occupancySensor.addService(sensor)
			sensor.addCharacteristic(Characteristic.ConfiguredName)
			sensor.addCharacteristic(Characteristic.CurrentAmbientLightLevel)
			sensor.setCharacteristic(Characteristic.ConfiguredName, device.info.name+' '+newSensor.name)
			sensor
				.getCharacteristic(Characteristic.OccupancyDetected)
				.on('get', this.getStatusoccupancy.bind(this, sensor))
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
				.setCharacteristic(Characteristic.OccupancyDetected, occupancy)
				.setCharacteristic(Characteristic.CurrentAmbientLightLevel, value)
		return occupancySensor
	}

	getStatusoccupancy(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(Characteristic.StatusFault).value == Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(Characteristic.OccupancyDetected).value
			callback(null, currentValue)
		}
	}
}
module.exports = occupancy