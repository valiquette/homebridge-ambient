export default class air {
	constructor(platform, log, api) {
		this.log = log
		this.platform = platform
		this.api = api
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
			airSensorX = new this.api.platformAccessory(device.info.name, uuid)
		}
		else{
			this.log.debug('update Accessory %s AQIN', device.info.name)
		}
		airSensorX.getService(this.api.hap.Service.AccessoryInformation)
			.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name)
			.setCharacteristic(this.api.hap.Charateristic.Manufacturer, this.platform.manufacturer)
			.setCharacteristic(this.api.hap.Charateristic.SerialNumber, device.macAddress)
			.setCharacteristic(this.api.hap.Charateristic.Model, "WS45")

		let airSensor=airSensorX.getService(this.api.hap.Service.AirQualitySensor)
		if(!airSensor){
			airSensor = new this.api.hap.Service.AirQualitySensor(name)
			airSensorX.addService(airSensor)
			airSensor.addCharacteristic(this.api.hap.Charateristic.ConfiguredName)
			airSensor.setCharacteristic(this.api.hap.Charateristic.ConfiguredName, device.info.name+' '+name)
			airSensor
			.getCharacteristic(this.api.hap.Charateristic.AirQuality)
			.on('get', this.getStatusAir.bind(this, airSensor))
		}

			let aqi=this.api.hap.Charateristic.AirQuality.UNKNOWN
			if(device.lastData.aqi_pm25_aqin >300) {aqi=this.api.hap.Charateristic.AirQuality.POOR}
			else if(device.lastData.aqi_pm25_aqin >200) {aqi=this.api.hap.Charateristic.AirQuality.POOR}
			else if(device.lastData.aqi_pm25_aqin >150) {aqi=this.api.hap.Charateristic.AirQuality.INFERIOR}
			else if(device.lastData.aqi_pm25_aqin >100) {aqi=this.api.hap.Charateristic.AirQuality.FAIR}
			else if(device.lastData.aqi_pm25_aqin >50) {aqi=this.api.hap.Charateristic.AirQuality.GOOD}
			else if(device.lastData.aqi_pm25_aqin >0) {aqi=this.api.hap.Charateristic.AirQuality.EXCELLENT}
			airSensor
				.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name+' '+name)
				.setCharacteristic(this.api.hap.Charateristic.StatusFault, this.api.hap.Charateristic.StatusFault.NO_FAULT)
				.setCharacteristic(this.api.hap.Charateristic.StatusLowBattery, this.api.hap.Charateristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(this.api.hap.Charateristic.AirQuality, aqi)
				.setCharacteristic(this.api.hap.Charateristic.PM2_5Density, device.lastData[pm])

		let batteryStatus=airSensorX.getService(this.api.hap.Service.Battery)
		if(!batteryStatus){
			batteryStatus = new this.api.hap.Service.Battery(name)
			airSensorX.addService(batteryStatus)

			batteryStatus
				.getCharacteristic(this.api.hap.Charateristic.StatusLowBattery)
				.on('get', this.getStatusLowBattery.bind(this, batteryStatus))
		}
			batteryStatus
				.setCharacteristic(this.api.hap.Charateristic.Name, device.info.name+' '+name)
				.setCharacteristic(this.api.hap.Charateristic.StatusLowBattery, batt)

		return airSensorX
	}

	getStatusAir(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(this.api.hap.Charateristic.StatusFault).value == this.api.hap.Charateristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(this.api.hap.Charateristic.AirQuality).value
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