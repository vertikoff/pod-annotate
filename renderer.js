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

var baseUrl = "http://127.0.0.1:5003";


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
function loadRemoteAudio(url, title, guid){
	Howler.unload();

	$('#player-controls button').each(function(){
		$(this).off();
	});

	sound = new Howl({
	  src: url
	});

	// $('#audio-file-state').text('downloading ' + title + '...');

	// CRV set guid
	$('#note-draft-field').attr('data-guid', guid);
	$('#note-draft-field').attr('data-title', title);
	$('#note-draft-field').attr('data-media-src', url);

	//CRV fetch previous notes for pod
	getNotes(guid);

	var empty_progress_bar = '<div class="progress">';
	empty_progress_bar += '<div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 100%" aria-valuenow="10" aria-valuemin="0" aria-valuemax="100"></div>';
	empty_progress_bar += '</div>';
	$('#audio-progress').empty().append(empty_progress_bar);
	// Clear listener after first call.
	sound.once('load', function(){
		$('#audio-file-state').text('ready to play!');
		$('#player-controls button').each(function(){
			$(this).removeAttr('disabled');
		});

		setPlayerControls(sound);
		setDurationBadge();

	});
}

function setDurationBadge(){
	var duration = createReadableTS(sound.duration());
	$('#audio-duration').text(duration);
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
	customPlayAudio();
	updateCurrentTS();
}

function customPlayAudio(){
	sound.play();
	// CRV only need to toggle the play icon if the audio was paused before this
	if($('#play').hasClass('play')){
		togglePlayPauseIcon();
	}
}

function setPlaybackSpeed(speed){
	sound.rate(speed);
	$('#current-speed').text(speed);
}

function resetNoteArea(){
	$('#note-draft-field').val('').removeAttr('note_start_ts');
	$('#note-draft-field').focus();
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
		updateCurrentTS();
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
	$('#note-draft-field').keypress(function(e){
		if(e.which == 13){
			e.preventDefault();
			createNote();
		}
	});

	$('#highlight').click(function(){
		createNote();
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

		$('.playback-speed').click(function(){
			var speed = $(this).text();
			setPlaybackSpeed(speed);
		});

		setInterval(function(){
			updateCurrentTS();
		}, 1000);
}

function createNote(){
	var media_id = $('#note-draft-field').attr('data-guid');
	var media_src = $('#note-draft-field').attr('data-media-src');
	var media_title = $('#note-draft-field').attr('data-title');
	var media_img = $('.pod-image').attr('src');
	var ts_start = $('#note-draft-field').attr('note_start_ts');
	var ts_end = sound.seek();
	var body = $('#note-draft-field').val();


	addNote(media_id, media_src, media_title, media_img, ts_start, ts_end, body);
	addNoteToDom(body, ts_start, media_id);
	resetNoteArea();
}

function addNoteToDom(content, ts_start, media_id){
	var html = "";
	html += "<div class='note_in_dom bs-callout bs-callout-info' data-ts-raw='" + ts_start + "'>";
	html += content;
	// html += "<br>"
	// // html += "<span>ts_start: " + ts_note_start + "</span>"
	// // html += "<br><span>ts_end: " + ts_note_end +"</span>";
	// html += "<br>";
	html += '<button type="button" class="close" aria-label="Close">';
  html += '<span aria-hidden="true">&times;</span>';
	html += '</button>';
	html += "</div>";
	var note_in_dom = $(html).appendTo('#info-pane');
 $(note_in_dom).find('.close').click(function(event){
	 event.stopPropagation();
		var ts_note_start = $(this).parent().attr('data-ts-raw');
		deleteNote(media_id, ts_note_start);
	});
	$(note_in_dom).click(function(){
		var ts_note_start = $(this).attr('data-ts-raw');
	 	playAudioAtTS(ts_note_start);
 	});
}

function updateCurrentTS(){
	var currentTSRaw = sound.seek();
	var cleanTS = createReadableTS(currentTSRaw);

	$('#current-ts').empty().append(cleanTS);

	updateProgressBar();
}

function createReadableTS(raw_ts){
	if(raw_ts < 1){
		var cleanTS = "0:00";
	} else{
		// console.log('min: ' + Math.floor(currentTSRaw/60));
		// console.log('sec: ' + currentTSRaw%60);
		var secs = Math.round(raw_ts%60);
		if(secs < 10)
			secs = '0' + secs;
		var cleanTS = Math.floor(raw_ts/60) + ':' + secs;
	}
	return(cleanTS);
}

function updateProgressBar(){
	var current_ts = sound.seek();
	var end_ts = sound.duration();
	var percentageComplete = current_ts/end_ts*100;
	var progress_bar_update = '<div class="progress-bar" role="progressbar" style="width: ' + percentageComplete + '%" aria-valuenow="' + percentageComplete + '" aria-valuemin="0" aria-valuemax="100"></div>';
	$('#audio-progress').children('.progress').empty().append(progress_bar_update);
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
			console.log('podcast feed:');
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
		html += '<option value="' + this.enclosure.url + '" data-title="' + this.title + '" data-guid="' + this.guid + '">' + this.title + '</option>';
	});
	html += '</select>';
	html += '</div>';

	var podInDom = $(html).appendTo('body');

  // load first episode
  loadRemoteAudio(data.episodes[0]["enclosure"]["url"], data.episodes[0]["title"], data.episodes[0]["guid"]);

	$(podInDom).find('.episode-selector').change(function(){
		var episodeURL = this.value;
    var epTitle = $(this).find(':selected').data('title');
		var epGuid = $(this).find(':selected').data('guid');
		loadRemoteAudio(episodeURL, epTitle, epGuid);
	});
}

function getNotes(media_id){
	$.ajax({
			type: "POST",
			url: baseUrl + "/api/get_notes/",
			dataType: "json",
			contentType: 'application/json',
			xhrFields: { withCredentials: true},
			data: JSON.stringify({"media_id": media_id}),
			success: function(json_data,textStatus,jqXHR){
				console.log('===== notes fetched ======');
				console.log(json_data);
				if(json_data.status ==1){
					addExistingNotesToDom(json_data.media_data, media_id);
				}
			},
			error: function(json_data,textStatus,jqXHR){
				console.log('notes NOT fetched ======');
				console.log(json_data);
			}
	});
}

function addNote(media_id, media_src, media_title, media_img, ts_start, ts_end, body){
	var postData = {
		"media_id": media_id,
		"media_src": media_src,
		"media_title": media_title,
		"media_img": media_img,
		"ts_start": ts_start,
		"ts_end": ts_end,
		"body": body
	};
	console.log(postData);
	$.ajax({
			type: "POST",
			url: baseUrl + "/api/add_note",
			dataType: "json",
			contentType: 'application/json',
			xhrFields: { withCredentials: true},
			data: JSON.stringify(postData),
			success: function(json_data,textStatus,jqXHR){
				console.log('note added');
				console.log(json_data);
			},
			error: function(json_data,textStatus,jqXHR){
				console.log('note NOT added');
				console.log(json_data);
			}
	});
}

function deleteNote(media_id, ts_start){
	var postData = {
		"media_id": media_id,
		"ts_start": ts_start
	};
	console.log(postData);
	$.ajax({
			type: "POST",
			url: baseUrl + "/api/delete_note",
			dataType: "json",
			contentType: 'application/json',
			xhrFields: { withCredentials: true},
			data: JSON.stringify(postData),
			success: function(json_data,textStatus,jqXHR){
				console.log('note DELETED');
				console.log(json_data);
				if(json_data.status == 1){
					$('#info-pane').find("[data-ts-raw='" + ts_start + "']").remove()
				}
			},
			error: function(json_data,textStatus,jqXHR){
				console.log('note NOT deleted');
				console.log(json_data);
			}
	});
}

function addExistingNotesToDom(media_info, media_id){
	console.log(media_info);
	var i = 0;
	for(var i=0; i < media_info.body.length; i++){
		var body = media_info.body[i];
		var ts_start = media_info.ts_start[i];
		addNoteToDom(body, ts_start, media_id);
	}
}
