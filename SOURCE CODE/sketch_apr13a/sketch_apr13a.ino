#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "DHT.h"

#define DHTPIN 2
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

MAX30105 particleSensor;

long lastBeat = 0;
float beatAvg = 0;
unsigned long lastDHTUpdate = 0; // Timer for non-blocking sensor reads

void setup() {
  Serial.begin(9600); // Faster baud rate recommended for sensor data
  Wire.begin();

  dht.begin();

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) { // Use I2C FAST (400kHz)
    Serial.println("MAX30102 ERROR");
    while (1);
  }

  // Default setup for heart rate
  particleSensor.setup(); 
  particleSensor.setPulseAmplitudeRed(0x0A); // Turn Red LED low to indicate it's running
  particleSensor.setPulseAmplitudeIR(0x1F);  // Sufficient IR power
}

void loop() {
  long irValue = particleSensor.getIR();

  // 1. BEAT DETECTION (Must run every loop iteration)
  if (checkForBeat(irValue) == true) {
    long delta = millis() - lastBeat;
    lastBeat = millis();

    if (delta > 300 && delta < 1500) {
      float bpm = 60.0 / (delta / 1000.0);
      
      // Smoothing filter
      if (beatAvg == 0) beatAvg = bpm; // Initialize avg
      else beatAvg = (beatAvg * 0.7) + (bpm * 0.3);
      
      Serial.print("--- BEAT DETECTED! BPM: ");
      Serial.println(beatAvg);
    }
  }

  // 2. NON-BLOCKING SENSOR READS (Runs every 2 seconds)
  if (millis() - lastDHTUpdate > 2000) {
    lastDHTUpdate = millis();

    if (irValue < 50000) {
      Serial.println("Finger not detected");
      beatAvg = 0; // Reset average when finger is removed
    } else {
      float temp = dht.readTemperature();
      Serial.print("Temp: ");
      Serial.print(temp);
      Serial.print("C | Avg BPM: ");
      Serial.print(beatAvg);
      
      // Very crude SpO2 estimation logic
      float spo2 = map(constrain(irValue, 50000, 100000), 50000, 100000, 95, 100);
      Serial.print(" | SpO2: ~");
      Serial.print(spo2);
      Serial.println("%");
    }
  }
}