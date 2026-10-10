# SkyTrace

**A simple missing-aircraft search area estimator**

## Chosen problem statement

When an aircraft loses contact, its last known position may be the only information available. SkyTrace makes a simple first estimate of where it might have travelled.

This is a classroom project. It is **not** a certified search-and-rescue system.

## Team members

- 2392608116 Suryasarthi Sahoo
- 2392608010 Avinash Kumar
- 2392608113 Suman Shekhar
- 2392608062 Aaravdeep Singh Dhillon

## What we built and why

SkyTrace is a small web app. You enter an aircraft’s last known location, the time since contact, its speed, and its heading.

The app estimates a possible location and shows an illustrative search area on a map. You can also try a demo scenario or show a sample search grid.

We built it to learn how a website can collect information, do simple calculations, and show results on a map.

## How to run SkyTrace

Keep all five project files in the same folder:

- `index.html`
- `style.css`
- `calc.js`
- `app.js`
- `test.js`

Open `index.html` in a web browser. An internet connection is needed to load the online map and map images.

## How to run the tests

If Node.js is installed, open a terminal in the project folder and enter:

```bash
node test.js

## Features not included yet

- SkyTrace does not track real aircraft or use live flight information.
- It does not include live weather, wind, fuel, or aircraft details.
- The estimate assumes the aircraft kept flying at the same speed and heading.
- The map grid’s High, Medium, and Low labels are examples. They are not real rescue probabilities.

SkyTrace is for learning and classroom demonstration only. Real search-and-rescue teams should use official information and tools.