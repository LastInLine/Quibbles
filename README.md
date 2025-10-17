# Paper Tweaks

Because PaperWM should feel like it belongs

## Description

When using the GNOME extension [PaperWM](https://github.com/paperwm/PaperWM), elements of the GNOME shell exist that aren't useful or needed in the context of a scrolling, tiling window manager.  This extension is meant to be a companion to PaperWM to address these concerns.

- **Trim the Window Context Menu**
  - Remove items from the context menu which no longer apply
- **Get rid of the Overview**
  - You know where your windows are, make the stock Activities button unclickable
- **Eliminate the mouse barrier to the right of the quick settings icons**
  - Doesn't have anything to do with PaperWM but I hate this barrier
	- *Please note that once the mouse barrier is removed, it cannot be restored without restarting the user session. Disable the **option**, log out, and log back in to restore the barrier.*
	- *Toggling the extension on and off twice will crash the shell if the mouse barrier has been destroyed in the current user session. This cannot be worked around.*

## Installation

1. Place the extension folder `papertweaks@lastinline.gmail.com` into your local extensions folder `~/.local/share/gnome-shell/extensions/`
2. Log out and log back in
3. Enable the extension in your extension manager