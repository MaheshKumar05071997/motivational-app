const fs = require('fs');
const path = require('path');

// Path to the broken file in node_modules
const filePath = path.join(__dirname, '../node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt');

try {
  if (fs.existsSync(filePath)) {
    let fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Fix 1: Null safety for getActiveTrack
    const broken1 = 'musicService.tracks[musicService.getCurrentTrackIndex()].originalItem';
    const fixed1 = 'musicService.tracks[musicService.getCurrentTrackIndex()].originalItem ?: Bundle()';
    
    // Fix 2: Null safety for getPlaybackState
    const broken2 = 'musicService.getPlayerStateBundle(musicService.state)';
    const fixed2 = 'musicService.getPlayerStateBundle(musicService.state) ?: Bundle()';

    if (fileContent.includes(broken1) && !fileContent.includes(fixed1)) {
      fileContent = fileContent.replace(broken1, fixed1);
      console.log('✅ Fixed getActiveTrack in MusicModule.kt');
    }
    
    if (fileContent.includes(broken2) && !fileContent.includes(fixed2)) {
      fileContent = fileContent.replace(broken2, fixed2);
      console.log('✅ Fixed getPlaybackState in MusicModule.kt');
    }

    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log('🚀 Successfully forced MusicModule.kt fix.');
  } else {
    console.log('⚠️ MusicModule.kt not found, skipping fix.');
  }
} catch (error) {
  console.error('❌ Error applying fix:', error);
}