
class air {
	constructor(platform, log) {
		this.log = log
		this.platform = platform
	}
	createAccessory(device, uuid, airSensorX, type) {
		let name='Outdoor Air Quality'
		let pm='pm25'
		let batt=!device.lastData.batt_25

		if(type=="in"){
			name ='Indoor Air Quality'
			pm='pm25_in'
			batt=0
		}
		if(!airSensorX){
			this.log.info('Adding air quality sensor for %s', device.info.name)
			airSensorX = new PlatformAccessory(device.info.name, uuid)
		}
		else{
			this.log.debug('update Accessory %s AQIN', device.info.name)
		}
		airSensorX.getService(Service.AccessoryInformation)
			.setCharacteristic(Characteristic.Name, device.info.name)
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.SerialNumber, device.macAddress)
			.setCharacteristic(Characteristic.Model, "WS45")

		let airSensor=airSensorX.getService(Service.AirQualitySensor)
		if(!airSensor){
			airSensor = new Service.AirQualitySensor(name)
			airSensorX.addService(airSensor)
			airSensor.addCharacteristic(Characteristic.ConfiguredName)
			airSensor.setCharacteristic(Characteristic.ConfiguredName, device.info.name+' '+name)
			airSensor
			.getCharacteristic(Characteristic.AirQuality)
			.on('get', this.getStatusAir.bind(this, airSensor))
		}

			let aqi=Characteristic.AirQuality.UNKNOWN
			if(device.lastData.aqi_pm25_aqin >300) {aqi=Characteristic.AirQuality.POOR}
			else if(device.lastData.aqi_pm25_aqin >200) {aqi=Characteristic.AirQuality.POOR}
			else if(device.lastData.aqi_pm25_aqin >150) {aqi=Characteristic.AirQuality.INFERIOR}
			else if(device.lastData.aqi_pm25_aqin >100) {aqi=Characteristic.AirQuality.FAIR}
			else if(device.lastData.aqi_pm25_aqin >50) {aqi=Characteristic.AirQuality.GOOD}
			else if(device.lastData.aqi_pm25_aqin >0) {aqi=Characteristic.AirQuality.EXCELLENT}
			airSensor
				.setCharacteristic(Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(Characteristic.AirQuality, aqi)
				.setCharacteristic(Characteristic.PM2_5Density, device.lastData[pm])

		let batteryStatus=airSensorX.getService(Service.Battery)
		if(!batteryStatus){
			batteryStatus = new Service.Battery(name)
			airSensorX.addService(batteryStatus)

			batteryStatus
				.getCharacteristic(Characteristic.StatusLowBattery)
				.on('get', this.getStatusLowBattery.bind(this, batteryStatus))
		}
			batteryStatus
				.setCharacteristic(Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(Characteristic.StatusLowBattery, batt)

		return airSensorX
	}

	getStatusAir(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(Characteristic.StatusFault).value == Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(Characteristic.AirQuality).value
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
module.exports = air