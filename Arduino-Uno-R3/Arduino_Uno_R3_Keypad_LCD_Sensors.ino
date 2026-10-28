/*
  Arduino Uno R3 — Keypad + 1602 I2C LCD + HC-SR04 + BMP280
  RECONSTRUCTED from the final project requirements discussed in chat.
  This is NOT a byte-for-byte export of the original Arduino IDE sketch.

  Wiring:
  4x4 keypad ROWS:    D2, D3, D4, D5
  4x4 keypad COLUMNS: D6, D7, D8, D9
  HC-SR04 TRIG: D13, ECHO: D12
  LCD 1602 I2C and BMP280 share Arduino SDA/SCL (same bus as A4/A5).
  BMP280 power: match your particular breakout board; use 3.3V if not 5V tolerant.

  Behavior:
  - LCD shows only keypad input (no sensor readings, no "Key:" label).
  - Numeric keys append digits, C deletes last, D clears input.
  - Serial Monitor shows pressed keypad keys and periodic sensor readings.

  Arduino IDE libraries (Library Manager):
    Keypad (Mark Stanley / Alexander Brevig)
    LiquidCrystal I2C (compatible version with init() and backlight())
    Adafruit BMP280 Library (plus Adafruit BusIO dependencies)
*/
#include <Wire.h>
#include <Keypad.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_BMP280.h>

const byte ROWS = 4;
const byte COLS = 4;
char keyMap[ROWS][COLS] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};
byte rowPins[ROWS] = {2, 3, 4, 5};
byte colPins[COLS] = {6, 7, 8, 9};
Keypad keypad = Keypad(makeKeymap(keyMap), rowPins, colPins, ROWS, COLS);

LiquidCrystal_I2C lcd(0x27, 16, 2); // Check your LCD I2C address.
Adafruit_BMP280 bmp;
const byte TRIG_PIN = 13;
const byte ECHO_PIN = 12;

char inputText[17] = "";
byte inputLength = 0;
bool bmpReady = false;
unsigned long lastReadingMs = 0;

void redrawInput() {
  lcd.setCursor(0, 0);
  lcd.print("                ");
  lcd.setCursor(0, 1);
  lcd.print("                ");
  lcd.setCursor(0, 0);
  lcd.print(inputText); // Only input on the LCD.
}

float measureDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  unsigned long durationUs = pulseIn(ECHO_PIN, HIGH, 25000UL);
  if (durationUs == 0) return -1.0f; // Timeout / no echo.
  return durationUs * 0.0343f / 2.0f;
}

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  Wire.begin();
  lcd.init();
  lcd.backlight();
  redrawInput();

  bmpReady = bmp.begin(0x76); // Most BMP280 boards use 0x76 or 0x77.
  if (!bmpReady) bmpReady = bmp.begin(0x77);
  Serial.println("Arduino Uno R3 project ready");
  Serial.println(bmpReady ? "BMP280 detected" : "BMP280 not detected");
}

void loop() {
  char key = keypad.getKey();
  if (key) {
    Serial.print("Pressed keypad key: ");
    Serial.println(key);
    if (key == 'D') {
      inputLength = 0;
      inputText[0] = '\0';
    } else if (key == 'C') {
      if (inputLength > 0) inputText[--inputLength] = '\0';
    } else if (key >= '0' && key <= '9' && inputLength < 16) {
      inputText[inputLength++] = key;
      inputText[inputLength] = '\0';
    }
    redrawInput();
  }

  if (millis() - lastReadingMs >= 1000UL) {
    lastReadingMs = millis();
    float distance = measureDistanceCm();
    Serial.print("Distance: ");
    if (distance < 0) Serial.println("No echo");
    else {
      Serial.print(distance, 1);
      Serial.println(" cm");
    }
    if (bmpReady) {
      Serial.print("Temperature: ");
      Serial.print(bmp.readTemperature(), 1);
      Serial.println(" C");
      Serial.print("Pressure: ");
      Serial.print(bmp.readPressure() / 100.0f, 1);
      Serial.println(" hPa");
    }
  }
}
