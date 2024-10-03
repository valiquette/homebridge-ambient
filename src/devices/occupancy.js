export default class occupancy {
	constructor(platform, log, api) {
		this.log = log
		this.platform = platform
		this.api = api
	}

	createAccessory(device, uuid, occupancySensor, newSensor) {
		let value = device.lastData[newSensor.dataPoint]
		let occupancy = value>newSensor.threshold ? true : false

		if(!occupancySensor){
			this.log.info('Adding custom sensor for %s', device.info.name)
			occupancySensor = new this.api.platformAccessory(device.info.name, uuid)
		}
		else{
			this.log.debug('update Accessory %s custom sensor', device.info.name)
		}
		occupancySensor.getService(this.api.hap.Service.AccessoryInformation)
			.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name)
			.setCharacteristic(this.api.hap.Charateristic.Manufacturer,	this.platform.manufacturer)
			.setCharacteristic(this.api.hap.Charateristic.SerialNumber, device.macAddress)
			.setCharacteristic(this.api.hap.Charateristic.Model, "WS")
			.setCharacteristic(this.api.hap.Charateristic.ProductData, "occupancy")

		//let sensor=occupancySensor.getService(this.api.hap.Service.occupancySensor)
		let sensor=occupancySensor.getService(this.api.hap.Service.occupancySensor)
		if(!sensor){
			sensor = new this.api.hap.Service.OccupancySensor(newSensor.name)
			occupancySensor.addService(sensor)
			sensor.addCharacteristic(this.api.hap.Charateristic.ConfiguredName)
			sensor.addCharacteristic(this.api.hap.Charateristic.CurrentAmbientLightLevel)
			sensor.setCharacteristic(this.api.hap.Charateristic.ConfiguredName, device.info.name+' '+newSensor.name)
			sensor
				.getCharacteristic(this.api.hap.Charateristic.OccupancyDetected)
				.on('get', this.getStatusoccupancy.bind(this, sensor))
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
				.setCharacteristic(this.api.hap.Charateristic.OccupancyDetected, occupancy)
				.setCharacteristic(this.api.hap.Charateristic.CurrentAmbientLightLevel, value)
		return occupancySensor
	}

	getStatusoccupancy(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(this.api.hap.Charateristic.StatusFault).value == this.api.hap.Charateristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(this.api.hap.Charateristic.OccupancyDetected).value
			callback(null, currentValue)
		}
	}
}