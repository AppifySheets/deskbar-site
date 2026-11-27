// Hands a task link on to Deskbar. https://deskbar.app/task#<task id> becomes
// deskbar://task/<task id>, which Deskbar registers on the PC as a URL protocol and answers
// by opening that task in its own window. See the comment at the top of index.html.
(function () {
  "use strict";

  // The id is everything after the #. Deskbar's ids are GUIDs; an 8-character prefix
  // (the short form used in titles and messages) is accepted too. Anything else is left
  // alone, so this page cannot be used to send other text to the protocol handler.
  var id = "";
  try {
    id = decodeURIComponent(location.hash.replace(/^#/, "")).trim();
  } catch (e) {
    id = "";
  }
  if (!/^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){0,3}(-[0-9a-fA-F]{12})?$/.test(id)) {
    document.getElementById("heading").textContent = "This task link is not complete";
    document.getElementById("status").textContent =
      "The link should end in # and the task's id. Copy it again from where you found it.";
    // Removed rather than hidden: site.css gives .button display: inline-flex, which beats the hidden attribute.
    document.getElementById("open").remove();
    return;
  }

  var target = "deskbar://task/" + id.toLowerCase();
  document.getElementById("heading").textContent = "Opening task " + id.slice(0, 8) + " in Deskbar";
  document.getElementById("status").textContent = "If Deskbar did not open, use the button below.";

  // The button is the way back if the browser's own prompt was dismissed.
  var button = document.getElementById("open");
  button.href = target;

  // ---------------------------------------------------------------------------------------
  // Closing this tab once Deskbar has the task (task 11e6bc0c: "let this window close
  // automatically when the task is opened"). Once Deskbar shows the task, this tab has done
  // its job and is only one more tab to close by hand.
  //
  // No reply comes back from a protocol hand-off, so the page reads the one sign it gets:
  // Deskbar brings the task's window to the front, the browser loses focus, and the page
  // sees "blur". Deskbar also brings a window forward when it cannot open the task (a
  // message box saying why), so a blur means Deskbar answered either way.
  //
  // The browser's own "Open Deskbar?" prompt blurs the page too, and closing the tab then
  // would take the prompt with it and Deskbar would never open. The two are told apart by
  // time, measured on 2026-11-27 in Chrome with a fresh profile: the prompt blurred the page
  // 24 ms after the hand-off, while Deskbar's link client alone takes about 200 ms to start
  // and reach the running Deskbar before any window of it can come forward. A blur sooner
  // than PromptWithin after the hand-off is therefore the prompt. Mistaking Deskbar for the
  // prompt only leaves the tab open, as before this change, while mistaking the prompt for
  // Deskbar would close the prompt with the tab and lose the link. So the line sits as high
  // as it can, six times the measured prompt and still under Deskbar's quickest answer: a
  // browser busy starting up draws its prompt later than an idle one did.
  //
  // When the prompt is answered the page gets "focus" back. "Open Deskbar" then starts
  // Deskbar and the next blur is Deskbar's; "Cancel" leaves the page focused and nothing
  // follows. Either way the page waits for Deskbar again, from that moment.
  //
  // Every wait is short (AnswerWithin). With Deskbar not installed the browser does nothing
  // at all, and the page tells the reader to go and check Deskbar: switching away to do so
  // must not close the page. A running Deskbar answers in well under a second. One that was
  // not running is started by the link and takes longer than the wait; the tab then stays
  // open, as it did before.
  //
  // Where the page cannot read the signs it leaves the tab alone:
  // - The page did not have focus when it handed the link on (a background tab opened with
  //   a middle-click, a browser window that did not come to the front). A blur never comes,
  //   or comes later for a reason the page cannot tell apart.
  // - The browser is not Chromium-based (Chrome, Edge). Only Chrome was measured; Firefox
  //   draws its own prompt differently and might blur the page later than PromptWithin.
  //   navigator.userAgentData exists only in Chromium browsers.
  // ---------------------------------------------------------------------------------------
  var PromptWithin = 150; // ms after the hand-off: a blur sooner than this is the browser's prompt
  var AnswerWithin = 4000; // ms: no blur by then, Deskbar is not coming; stop waiting

  var waitingSince = 0; // when the page began waiting for Deskbar to answer; 0 = not waiting
  var handedOffAt = 0; // when location.href was last set to the deskbar: link
  var promptShowing = false; // the browser's "Open Deskbar?" prompt is up
  var measured = !!navigator.userAgentData; // a Chromium browser, the kind that was measured

  function handOff() {
    promptShowing = false;
    handedOffAt = Date.now();
    waitingSince = measured && document.hasFocus() ? handedOffAt : 0;
  }

  window.addEventListener("blur", function () {
    if (!waitingSince || promptShowing) return;
    var now = Date.now();
    if (now - waitingSince > AnswerWithin) {
      waitingSince = 0;
      return;
    }
    if (now - handedOffAt < PromptWithin) {
      promptShowing = true;
      return;
    }
    closeTab();
  });

  window.addEventListener("focus", function () {
    if (!promptShowing) return;
    // The prompt was answered. Whichever button, wait for Deskbar from now; after Cancel
    // nothing comes and the wait runs out.
    promptShowing = false;
    waitingSince = Date.now();
  });

  // The button starts the same hand-off, so it waits for Deskbar the same way.
  button.addEventListener("click", handOff);

  // Back to this page from the history (the back-forward cache keeps the script's state):
  // whatever the page was waiting for is long over.
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) waitingSince = 0;
  });

  function closeTab() {
    waitingSince = 0;
    // Sent rather than "open": Deskbar also answers with a message box when it cannot open
    // the task, and the reader sees this only if the tab cannot be closed.
    document.getElementById("heading").textContent = "Task " + id.slice(0, 8) + " sent to Deskbar";
    document.getElementById("status").textContent = "You can close this tab.";
    // A script may close a tab the link opened as a new tab (its history holds only this
    // page). A tab that came here from another page in the same tab, a pull request say, is
    // not the script's to close: there the page goes back to where the link was clicked,
    // which takes this page away just the same.
    window.close();
    setTimeout(function () {
      if (!window.closed && history.length > 1) history.back();
    }, 200);
  }

  // Straight away, the way a short link forwards. The browser asks before it starts
  // Deskbar the first time, and can remember the answer for deskbar.app.
  handOff();
  location.href = target;
})();
