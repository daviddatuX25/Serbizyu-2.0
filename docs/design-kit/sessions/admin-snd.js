/**
 * Serbizyu 2.0 — SND01 Mathematical Web Audio Micro-Interaction Sound Palette
 * Inspired by https://snd.dev/ (SND01 Sine kit)
 * Pure Web Audio API — zero dependencies, zero audio files to load.
 */

(function (window) {
  'use strict';

  var audioCtx = null;
  var isEnabled = localStorage.getItem('serbizyu_admin_sound') !== 'false';

  function getAudioContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  var SoundKit = {
    isEnabled: function () {
      return isEnabled;
    },

    toggle: function () {
      isEnabled = !isEnabled;
      localStorage.setItem('serbizyu_admin_sound', isEnabled ? 'true' : 'false');
      SoundKit.updateUI();
      if (isEnabled) {
        SoundKit.tap();
      }
      return isEnabled;
    },

    updateUI: function () {
      var toggles = document.querySelectorAll('.btn-snd-toggle');
      toggles.forEach(function (btn) {
        if (isEnabled) {
          btn.classList.add('sound-on');
          btn.innerHTML = '<span>🔊</span> Sound: ON';
        } else {
          btn.classList.remove('sound-on');
          btn.innerHTML = '<span>🔇</span> Sound: MUTED';
        }
      });
    },

    /**
     * Crisp 18ms sine blip for chips, buttons, tabs
     */
    tap: function () {
      if (!isEnabled) return;
      try {
        var ctx = getAudioContext();
        if (!ctx) return;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();

        var now = ctx.currentTime;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(940, now + 0.02);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.025);
      } catch (e) {
        // AudioContext not allowed before user gesture
      }
    },

    /**
     * Twin sine pop for cohort and segmented switches
     */
    switch: function () {
      if (!isEnabled) return;
      try {
        var ctx = getAudioContext();
        if (!ctx) return;
        var now = ctx.currentTime;

        // Pop 1
        var osc1 = ctx.createOscillator();
        var gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(620, now);
        gain1.gain.setValueAtTime(0.07, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.02);

        // Pop 2
        var osc2 = ctx.createOscillator();
        var gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(920, now + 0.02);
        gain2.gain.setValueAtTime(0.09, now + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.02);
        osc2.stop(now + 0.045);
      } catch (e) {}
    },

    /**
     * Resonant C-major triad chirp for authorized confirmation
     */
    confirm: function () {
      if (!isEnabled) return;
      try {
        var ctx = getAudioContext();
        if (!ctx) return;
        var now = ctx.currentTime;
        var notes = [523.25, 659.25, 783.99]; // C5, E5, G5

        notes.forEach(function (freq, idx) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          var t = now + idx * 0.035;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.12);
        });
      } catch (e) {}
    },

    /**
     * Descending amber warning sine wave for holds and disputes
     */
    warn: function () {
      if (!isEnabled) return;
      try {
        var ctx = getAudioContext();
        if (!ctx) return;
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.095);
      } catch (e) {}
    },

    /**
     * Low sine whoosh for drawers and modals
     */
    drawer: function () {
      if (!isEnabled) return;
      try {
        var ctx = getAudioContext();
        if (!ctx) return;
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(340, now + 0.06);

        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.07);
      } catch (e) {}
    }
  };

  // Bind audio triggers on click
  document.addEventListener('DOMContentLoaded', function () {
    SoundKit.updateUI();

    document.addEventListener('click', function (e) {
      var target = e.target.closest('[data-snd]');
      if (!target) return;
      var sndType = target.getAttribute('data-snd');
      if (SoundKit[sndType]) {
        SoundKit[sndType]();
      }
    });

    // Delegated sound toggle button click
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn-snd-toggle');
      if (btn) {
        SoundKit.toggle();
      }
    });
  });

  window.AdminSound = SoundKit;
})(window);
