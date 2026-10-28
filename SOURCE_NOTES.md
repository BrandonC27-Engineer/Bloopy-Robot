# Bloopy | source code and additional PCB files

This repository contains a source reconstruction for the Bloopy companion app,
the Arduino Uno R3 demonstration sketch, and additional editable KiCad schematics.

## What is verified and what is not

- `Bloopy-App-Reconstructed/` is a **reconstruction** of the v0.4B Next.js app
  from an earlier full source release and later update files. It is **not** an
  exact exported snapshot of the Raspberry Pi currently in use and may lack
  subsequent local edits. The original archive describes code compiled and
  tested in parts; this copy has not been newly built or tested here.
- `Arduino-Uno-R3/Arduino_Uno_R3_Keypad_LCD_Sensors.ino` is a **recreated
  sketch** based on the maker's described HC-SR04, LCD and keypad project.
  The original hand-edited Arduino IDE file was not recovered.
- `PCB-Additional-Schematics/` contains the two corresponding KiCad schematics
  and project settings. Board layouts and the exported 3D stand were uploaded
  earlier to the repository.
- ESP32 code used on the working stationary robot is **not** included in this
  source-recovery ZIP. Retrieve the original `.ino` separately from Arduino IDE.
- The custom PCB for a future moving/balancing robot was designed and
  manufactured but not populated or electrically validated. The stationary
  prototype's triangular PCB was assembled and tested.

## Contribution attribution

Brandon Carmona conceived the hardware and product, designed CAD and PCBs,
assembled electronics, specified software behavior, reviewed generated code,
integrated and tested the prototype. Claude generated much of the app's base
code/UI from detailed user instructions; ChatGPT helped generate and refine
firmware, animation, and integration code. This repository is not presented as
entirely handwritten software.

## Security and reproducibility

Only sample environment configuration is included, never live `.env.local`
files or tokens. Review all configuration again before making future commits.
Running the app requires separately configured private services/credentials
and Raspberry Pi hardware. The code here is a documentary source snapshot,
not a guaranteed one-command runnable replica of the physical robot.
