# Arduino Uno R3 source

`Arduino_Uno_R3_Keypad_LCD_Sensors.ino` is a **reconstruction** of the final code's requested functionality, not the exact byte-for-byte original uploaded to the Arduino IDE.

Final project configuration discussed: Uno R3; 4×4 keypad pins D2–D9 (rows D2–D5, columns D6–D9); HC-SR04 TRIG D13/ECHO D12; LCD 1602 with I²C and BMP280 sharing SDA/SCL. Numeric keys appear on the LCD, `C` backspaces, `D` clears, and keypad presses and sensor readings go to the Serial Monitor. LCD shows only input.

Some intermediate experiments also used DHT11 and a sound sensor, but the final simplified sketch available in conversation did not establish their final Uno pin assignments. Those additions are not fabricated here.

For your **actual compiled Arduino source**, open Arduino IDE > Sketch > Show Sketch Folder, copy the `.ino` and all `.h`/`.cpp` files in that folder. Those are more authoritative than this reconstruction. The included PowerShell exporter can copy that folder once you provide its path.
