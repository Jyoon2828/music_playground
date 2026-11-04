import test from 'node:test';
import assert from 'node:assert/strict';
import {playbackPosition,videoExtension} from '../dist/video.js';

test('video scene cursor changes at the same four-beat boundaries as the audio, including rests',()=>{
  assert.deepEqual(playbackPosition(-.15,3),{index:0,progress:0,fraction:0,ended:false});
  assert.deepEqual(playbackPosition(3,3),{index:1,progress:0,fraction:.25,ended:false});
  assert.deepEqual(playbackPosition(7.5,3),{index:2,progress:.5,fraction:.625,ended:false});
  assert.deepEqual(playbackPosition(12.25,3),{index:3,progress:0,fraction:1,ended:true});
});
test('video extension follows the recorded container, without relabeling WebM as MP4',()=>{
  assert.equal(videoExtension('video/mp4;codecs=avc1.42e01e,mp4a.40.2'),'mp4');
  assert.equal(videoExtension('video/webm;codecs=vp8,opus'),'webm');
});
