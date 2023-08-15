# Storage Data Manager  
## Manage all you hard disk drive data with a very easy UI and highly customizable configuration.
### App currently might only work on Windows, as it hasn't been fully tested on Linux or Mac osx, but will do it soon. Don't forget to star the repo, and check back later for updates.
### Features
 - Scan and add any data from your hard drive. There are a few definitions which will help you to collect your data more precisely.
 - Categorize your data.
 - Search your data with many filters.
 - Move data between categories.
 - Query file info, at the moment only support movie/tv related stuff (Backed by TMDb, you'll need to supply your own TMDb token if you want to use this feature. [How to get it](https://developers.themoviedb.org/3/getting-started/introduction)). We'll also support music and game stuff very soon. PRs are welcome. 
 - For video file, there you can build your watchlist and watch history. 
 - Localized. But now there are only English and Simplified-Chinese. If you want to translate into your language, please send a PR. Check out data/localization directory, you will have a clue how to achieve it.
 - There are still some other little sugar pies, Come and try it😆.

### Download and Install
1) Native Program.
- For Windows, Download [installer](https://github.com/wrifun-tech/storage-data-manager/releases/download/v1.0.0/StorageDataManager-Setup-1.0.0.exe) or [portable version](https://github.com/wrifun-tech/storage-data-manager/releases/download/v1.0.0/StorageDataManager-v1.0.0-portable.exe).
- For Linux or Mac osx, still in testing phase, will be coming soon.

2) Alternatively. 
- you can clone the repo ```git clone https://github.com/wrifun-tech/storage-data-manager.git```.
- Make sure you have Node.js>=12 installed.
- Then install the dependancies by enteting the command ```npm install``` or ```yarn``` in your terminal.
- After that, start the server ```npm run start```, for developing, you can go with ```npm run dev```.
- Then in your browser, open the url http://localhost:8676, it will start the app. In case this port is not available, you can always check your termial to see which port has been used. 
- Play it or happy coding.

### Let's take a look by watching a video.
https://user-images.githubusercontent.com/90248822/133627177-3ff6a770-d958-400b-8f2e-1e24f50cfcda.mp4

### Powered by
<a href="https://www.wrifun.com"><img src="https://static.wrifun.com/medias/images/logo.png" width="60" alt="Wrifun" /></a>

### License
GNU GPLv3
