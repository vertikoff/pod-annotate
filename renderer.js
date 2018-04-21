// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.


//Start code to add custom close button
const remote = require('electron').remote;

// podcast feed parsing includes
const request = require('request');
const parsePodcast = require('./node_modules/node-podcast-parser');

/*
document.getElementById("close-btn").addEventListener("click", function (e) {
       var window = remote.getCurrentWindow();
       window.close();
  });
*/
// End code to add custom close button

var window = remote.getCurrentWindow();
window.webContents.on('did-finish-load', function() {

	initializeButtonInstructions();


//	parsePodcastFeed("http://timferriss.libsyn.com/rss");


//	parsePodcastFeed("http://theknowledgeproject.libsyn.com/rss");

    parsePodcastFeed("https://rss.art19.com/the-daily");
});

function initializeButtonInstructions(){
	$('#select-audio').click(function(){
		var audioSrc = $('#audio-url').val();
    var epTitle = $('#audio-url').find(':selected').data('title');
		loadRemoteAudio(audioSrc, epTitle);
	});
}

// CRV making Howler sound object global
var sound;
function loadRemoteAudio(url, title){
	Howler.unload();

	$('#player-controls button').each(function(){
		$(this).off();
	});

	sound = new Howl({
	  src: url
	});

	$('#audio-file-state').text('downloading ' + title + '...');

	// Clear listener after first call.
	sound.once('load', function(){
		$('#audio-file-state').text('ready to play!');
		$('#player-controls button').each(function(){
			$(this).removeAttr('disabled');
		});

		setPlayerControls(sound);

	});
}

function togglePlayPauseIcon(){
	if($('#play').hasClass('play')){
			$('#play').removeClass('play')
			var classToAdd = 'fa-pause-circle';
	}
	else {
			$('#play').addClass('play');
			var classToAdd = 'fa-play-circle';
	}
	$('#play').empty().append('<i class="fas ' + classToAdd + '"></i>');
	// if($('#play').hasClass('fa-play-circle')){
	// 	$('#play').removeClass('fa-play-circle').addClass('fa-pause-circle');
	// 	console.log('toggling to pause icon');
	// }
	// else {
	// 	$('#play').removeClass('fa-pause-circle').addClass('fa-play-circle').addClass('play');
	// 	console.log('toggling to play icon');
	// }
}

function playAudioAtTS(ts){
	sound.seek(ts);
}


function setPlayerControls(sound){
	$('#play').click(function(){
		if($(this).hasClass('play')){
			sound.play();
			togglePlayPauseIcon();
		}
		else{
			sound.pause();
			togglePlayPauseIcon();
		}
		updateCurrentTS(sound);
	});

	//CRV detect that
	$("#note-draft-field").bind("keyup paste", function() {
		var current_note_start = $(this).attr('note_start_ts');
		//CRV if there isn't already a timestamp of when the note started, lets set it
		if (typeof current_note_start == typeof undefined || current_note_start == false){
			$(this).attr('note_start_ts', sound.seek());
			console.log('setting note_start_ts to: ' + sound.seek());
		}
	});

	$('#highlight').click(function(){
		var ts_note_end = sound.seek();
		var ts_note_start = $('#note-draft-field').attr('note_start_ts');
		var note_body = $('#note-draft-field').val();
		var note_in_dom ="<div class='note_in_dom'><span>highlight added: " + note_body + "</span><br><span>ts_start: " + ts_note_start + "</span><br><span>ts_end: " + ts_note_end +
		 "</span><br><button class='note'>Listen</button></div>";
		var new_note = $(note_in_dom).appendTo('#info-pane');

		 $(new_note).children('.note').click(function(){
			playAudioAtTS(ts_note_start);
		});
	});

    $('#skipforward').click(function(){
        var tsCurrent = sound.seek();
        var newTS = tsCurrent + 30;
        sound.seek(newTS);
    });

    $('#skipback').click(function(){
        var tsCurrent = sound.seek();
        var newTS = tsCurrent - 30;
        if(newTS < 0)
            newTS = 0;
        sound.seek(newTS);
    });

		setInterval(function(){
			updateCurrentTS(sound);
		}, 1000);
}

function updateCurrentTS(soundObj){
	currentTSRaw = soundObj.seek();
	if(currentTSRaw == 0){
		var cleanTS = "0:00";
	} else{
		// console.log('min: ' + Math.floor(currentTSRaw/60));
		// console.log('sec: ' + currentTSRaw%60);
		var secs = Math.round(currentTSRaw%60);
		if(secs < 10)
			secs = '0' + secs;
		var cleanTS = Math.floor(currentTSRaw/60) + ':' + secs;
	}

	$('#current-ts').empty().append(cleanTS);
}


function parsePodcastFeed(url){
	request(url, (err, res, data) => {
	  if (err) {
	    console.error('Network error', err);
	    return;
	  }

	  parsePodcast(data, (err, data) => {
	    if (err) {
	      console.error('Parsing error', err);
	      return;
	    }

	    console.log(data);
	    buildPodCastEpisodeSelectionUI(data);
	  });
	});
}

function buildPodCastEpisodeSelectionUI(data){
	var podImage = data.image;
	var podTitle = data.title;

	var html = '<div class="pod-holder">';
	html += '<img class="pod-image" style="width:100px;" src="' + podImage + '">';
	html += '<span class="pod-title">' + podTitle + '</span>'
	html += '<select class="episode-selector">';
	$.each(data.episodes, function(){
		html += '<option value="' + this.enclosure.url + '" data-title="' + this.title + '">' + this.title + '</option>';
	});
	html += '</select>';
	html += '</div>';

	var podInDom = $(html).appendTo('body');

  // load first episode
  loadRemoteAudio(data.episodes[0]["enclosure"]["url"], data.episodes[0]["title"]);

	$(podInDom).find('.episode-selector').change(function(){
		var episodeURL = this.value;
    var epTitle = $(this).find(':selected').data('title');
		loadRemoteAudio(episodeURL, epTitle);
	});
}