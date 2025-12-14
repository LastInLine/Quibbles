<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./images/quibbles-logo-dark.svg">
  <img alt="Quibbles Logo" src="./images/quibbles-logo-light.svg" width="600">
</picture>

# Quibbles

A personal project to alleviate annoyances from the GNOME shell, particularly when used with the superb [PaperWM](https://github.com/paperwm/PaperWM) window manager

## Description

The user of this extension can:

- **Trim and reorder the Window Context Menu**
  - Remove items from the title bar context menu and put them into an order that makes sense to you. Useful when used with a tiling window manager that doesn't have some concepts.
  
  ![Customized title bar context menu](images/window-menu.png)
  
- **Get rid of the Overview**
  - Make the stock workspace indicator button unclickable or replace the stock indicator with a custom version that leads directly to hidden workspaces rather than having them behind a context change.
  - Customizable to accommodate multiple visible workspaces and layouts.
  - Friendly names accommodated but not provided by this extension.

https://github.com/user-attachments/assets/0664e52f-6d27-4b90-bbc1-bc5374a9c17e


- **Eliminate the mouse barrier to the right of the quick settings icons**
  - Finally go where you've never gone before (which is to the right monitor at the very top).

    https://github.com/user-attachments/assets/9e8f998e-c60f-40ce-9840-841b1c4a21ee
    
- **Have the selected date in the date menu go to the actual date in Google Calendar rather than the current date in GNOME Calendar**
  - Wonder in amazement at a button now leading to the place it has written on it.
- **Add the current temperature and conditions after the clock**
  - Wanting to know what the weather is now rather than an hour from now which is all that is displayed in the menu? This addresses that vexing concern.
  - Adapted from the delightfully elegant [Weather O'Clock](https://github.com/CleoMenezesJr/weather-oclock) by Cleo Menezes Jr.
  
  ![Weather on the date menu button](images/date-weather.png)
  
- **Unblank the lockscreen**
  - Wishing there was some kind of state between "awake and in use" and "monitors off"? That's right, that thing that's been on every computer for decades has returned in a degraded, less aesthetically variable state.
  - Used with attribution from the excellent [Unblank lock screen](https://github.com/sunwxg/gnome-shell-extension-unblank) by Xiaoguang Wang.
- **Change the lockscreen clock font and size**
  - Improve the lockscreen appearance with a simple change to the incredibly ugly defaults. Pleasant if you've decided to let it linger on the screen using the previous feature.

https://github.com/user-attachments/assets/27dcd960-2c69-4b53-be29-d8f2072f93f5

- **Add shortcuts to the system icon row in the Quick Settings menu**
  - Do you find it odd that there's a screenshot button next to the Settings button as though they were related? Do you wish there were links here to frequently used applications that should be in the Settings but aren't such as Tweaks or Extensions? Are you missing a tray where you could drop links to arbitrary applications for quick access which has been a feature common across operating systems for thirty years? If the answer to any of those questions is "yes" then you might like this feature.
  - Adapted from my longtime favorite [Tweaks & Extensions in System Menu](https://github.com/F-i-f/tweaks-system-menu) by Philippe Troin (F-i-f).
  
  ![System menu launcher](images/quick-settings-launcher.png)

## Preferences

  ![Prefs](images/prefs.png)
  
## Installation

1. Place the extension folder `quibbles@lastinline.gmail.com` into your local extensions folder `~/.local/share/gnome-shell/extensions/`
2. Log out and log back in
3. Enable the extension in your extension manager

## About the author, the extension, & how it was made

I'm neither a coder nor an expert on Linux. This extension was developed with the heavy use of AI and the code itself is, I'm certain, not conventionally structured and overly commented. It will not pass review on [EGO](https://extensions.gnome.org) because of this. I rely on the try-catch blocks to keep the rest of the extension functional while creating it in situ on my sole machine with only a text editor as I have no idea how to use an IDE. If I were to clean up the code to the point where it could pass review by removing the try-catch blocks and comments for a beginner, I could not maintain it.

If someone else wants to clean things up and maintain it they are welcome to, of course. I make it public because it was created to solve problems I had (which it does) and if anyone else is affected by those same problems it's better to make the solutions available rather than keep them to myself. If the code is too poor for their use as it comes at least it can point them in a direction where they can make it acceptable to them.

## Copyright & Attributions

Copyright (c) 2025, LastInLine, Quibbles

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

Portions of this software are derived from the "Tweaks in System Menu" extension
(https://github.com/F-i-f/tweaks-system-menu),
which is licensed under the GNU General Public License v3.0.

Copyright (c) 2019-2024 F-i-f

Portions of this software are derived from the "Weather O'Clock" extension (https://github.com/CleoMenezesJr/weather-oclock) which is licensed under the GNU General Public License v3.0.

Copyright (c) 2023-2025 Cleo Menezes Jr.

Portions of this software are also derived from the "Unblank Lockscreen" extension
(https://github.com/sunwxg/gnome-shell-extension-unblank),
which is licensed under the following terms:

Copyright (c) 2018 Xiaoguang Wang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
