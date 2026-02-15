# Tally Accounts

An account system for my silly little projects

https://accounts.tally.gay

### About

This is an accounts system, similar to Google or Microsoft!
Accounts dont do much on their own, but they can be used to log into apps and services.
In Googles case, these are things like Gmail, YouTube, GCP, Google Drive, Google Docs, etc etc you get the point.

This account system is designed to be just as flexable!

Currently Tally Accounts have no services to log into. I am currently working on migrating my past apps to this new system.
My app [Todo](https://todo.tally.gay) has its own account system.

When I tried to start a new project, I realized i would need to either make a completely seperate system for the new app, or deal with no accounts. This did not sit well with me so I started on this project

## Usage

### Creating an account

To create an account you have 2 options:

1. Username & Password

   On the [signup](https://accounts.tally.gay/signup) page, simply type in a username and password, hit create, and youre done!

2. Third party service

   On the [signup](https://accounts.tally.gay/signup) page, click on either the Discord or GitHub buttons. this will redirect you to their respective OAuth2 pages.

   Once authenticated with GitHub or Discord, you will be prompted to pick a username, once you hit create, you now have your account!

### Editing your account

Accounts can be edited in the [edit](https://accounts.tally.gay/@me/edit) page. Here you can:

- Upload/change your profile picture
- Change your username
- Change your password
- Remove your password
- Add a password
- Add a third party login
- Remove a third party login
- Set your bio & pronouns
- Set a display name
- Delete your account

### Logging in

To [log in](http://localhost:5173/login), enter your username and password, or click on the Discord or GitHub buttons to log in with those services.

If you attempt to log in with a third party service, but that service is not linked to an account, you will be prompted to create an account with that service.

### Logging out

To log out, simply click the logout button in the top right corner of the card in the [@me](https://accounts.tally.gay/@me) page, or go to [logout](https://accounts.tally.gay/logout) to log out.

<small>ps: im gonna add a better way to log out in the nav bar i just forgot also pretend you didnt see this im breaking my formal-ish character okay bye</small>

### Deleting your account

To delete your account, go to the [edit](https://accounts.tally.gay/@me/edit) page, scroll to the bottom, and click the delete account button.

After 4 confirmations, your account will be deleted. This is to prevent accidental deletions, so be careful!

Deleting your account immediately deletes all of your data, including:

- Your profile picture
- Your username (will be free immediately after deletion)
- Your password
- Your linked third party accounts
- Your bio & pronouns
- Your display name

There will be no trace of you\*

<small>\*idk mabye the data still exists on disk but its marked as deleted and will be overwritten eventually, but for all intents and purposes, its gone</small>

### Oauth system

The whole point of this app is to authenticate with other apps! This is the system that lets that happen!

Apps can redirect the OAuth2 authorization page, where the user confirmes, and is redirected back to the with an access code to get an access token, which can be used to authenticate with the app.

To test this system out you can go to these links:

- [Only Identity](https://accounts.tally.gay/oauth2/authorize?client_id=1jhd8su1ffa62d2cc&redirect_uri=https%3A%2F%2Faccounts.tally.gay%2Ftestoauth2&scope=1&sig=a1fddcc591a245c948f961de0eab3a6694a2d2e167d883d09faec56f19d9b556)
- [Identity + GitHub](https://accounts.tally.gay/oauth2/authorize?client_id=1jhd8su1ffa62d2cc&redirect_uri=https%3A%2F%2Faccounts.tally.gay%2Ftestoauth2&scope=5&sig=fc661172b2b5230a7fc1f7579f6de28527b3dd61e1b9921dd09a30fc66fb1251)
- [Identity + Discord](https://accounts.tally.gay/oauth2/authorize?client_id=1jhd8su1ffa62d2cc&redirect_uri=https%3A%2F%2Faccounts.tally.gay%2Ftestoauth2&scope=3&sig=a35b64e78a7173d7d70f6e084af56dd28b93bdd4479d8274069652780f92e2c9)
- [Identity + GitHub + Discord](https://accounts.tally.gay/oauth2/authorize?client_id=1jhd8su1ffa62d2cc&redirect_uri=https%3A%2F%2Faccounts.tally.gay%2Ftestoauth2&scope=7&sig=08bf5edf9de7d1651ac3abb06e39cd0f0e4ff850ac69de668ca768fb8427cc67)
- [Nothing? (just for fun)](https://accounts.tally.gay/oauth2/authorize?client_id=1jhd8su1ffa62d2cc&redirect_uri=https%3A%2F%2Faccounts.tally.gay%2Ftestoauth2&scope=0&sig=575b6e8f6cb9f0462f2bf728a909b10805447fb246980a644dc7c50d199992e3)

These pages show what apps can see with each scope!

You can also test out the parameter signing and verification system! Here are a few links that have issues (they should error!)

- [Missing signature](https://accounts.tally.gay/oauth2/authorize?client_id=1jhd8su1ffa62d2cc&redirect_uri=https%3A%2F%2Faccounts.tally.gay%2Ftestoauth2&scope=1)
- [Modified signature](https://accounts.tally.gay/oauth2/authorize?client_id=1jhd8su1ffa62d2cc&redirect_uri=https%3A%2F%2Faccounts.tally.gay%2Ftestoauth2&scope=1&sig=hiimtally)
- [Modified scope](https://accounts.tally.gay/oauth2/authorize?client_id=1jhd8su1ffa62d2cc&redirect_uri=https%3A%2F%2Faccounts.tally.gay%2Ftestoauth2&scope=3&sig=a1fddcc591a245c948f961de0eab3a6694a2d2e167d883d09faec56f19d9b556)
- [Modified redirect url](https://accounts.tally.gay/oauth2/authorize?client_id=1jhd8su1ffa62d2cc&redirect_uri=https%3A%2F%2Faccounts.tally.gay%2Ftestoauth3&scope=1&sig=a1fddcc591a245c948f961de0eab3a6694a2d2e167d883d09faec56f19d9b556)
- [Incorrect redirect url (with valid signature (shouldnt happen but i still tested for it))](https://accounts.tally.gay/oauth2/authorize?client_id=1jhd8su1ffa62d2cc&redirect_uri=https%3A%2F%2Faccounts.tally.gay%2Ftestoauth3&scope=1&sig=656a9a123e9d09c442902b1eb1436582ad32acf3e966cf1c3beb2bb94de10c9d)

## Future plans

- Add Google as a third party login option <small>(this is a maybe)</small>
- Add more customization options for accounts (themes, profile layouts, etc)
- Add a way to see and manage active sessions (see where youre logged in and remove sessions you dont recognize or dont use anymore)
- Add 2fa for passwords
  <small>(Technically already supported by the accounts system, I just did not create an api for it yet.)</small>

- Split up the edit page so everything isnt all smushed together into one page
