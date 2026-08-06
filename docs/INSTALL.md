# Install Guide

## Requirements

* Install [node](https://nodejs.org/en/download) to run the required scripts
* Ask Claude to set `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` to 2 in the env in `~/.claude/settings.json`


## Installation

To install within the Claude desktop app, press the **＋** button near the chat box and select **Add Plugins**:

![install](./assets/install-1.png)

In the popup press the **＋** button again to add a marketplace:

![install](./assets/install-2.png)

Select **Add from a repository**:

![install](./assets/install-3.png)

Then enter `nickeng/safe-travels` and press **Sync**:

![install](./assets/install-4.png)

Back in the plugins popup select the **Code** tab and you should see the Safe Travels plugin. Press the **＋** on Safe Travels card to install:

![install](./assets/install-5.png)

## Usage

After install you can now create guides by typing `/safe-travels:create-guide` then entering your trip information:

![install](./assets/install-6.png)

This will start the creation of your guide, note it takes 30-60mins to create a guide:

![install](./assets/install-7.png)

When Claude is done your guide will open in the app:

![install](./assets/install-8.png)

Open the guide in your browser for a fullscreen view.
