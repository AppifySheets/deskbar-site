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
  document.getElementById("open").href = target;

  // Straight away, the way a short link forwards. The browser asks before it starts
  // Deskbar the first time, and can remember the answer for deskbar.app.
  location.href = target;
})();
