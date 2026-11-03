/* Netra analytics consent gate (GA4 + Microsoft Clarity).
   Loads NOTHING until the visitor taps Accept. The choice is remembered on this
   device (localStorage "netra_analytics_consent" = "yes" | "no"); choosing
   "No thanks" loads nothing, ever. Clarity runs with strict masking; form fields
   carry data-clarity-mask. Privacy policy: /legal/data-safety.html */
(function () {
  "use strict";

  /* ---- configuration (same values on every Netra site) ---- */
  var GA4_MEASUREMENT_ID = "G-G0LT31839L";
  var CLARITY_PROJECT_ID = "z7sg7c01gf";

  var KEY = "netra_analytics_consent";

  function choice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function loadAnalytics() {
    /* Google Analytics 4 */
    var g = document.createElement("script");
    g.async = true;
    g.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_MEASUREMENT_ID);
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA4_MEASUREMENT_ID, { anonymize_ip: true });

    /* Microsoft Clarity (strict masking is set in the project dashboard) */
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    var c = document.createElement("script");
    c.async = true;
    c.src = "https://www.clarity.ms/tag/" + encodeURIComponent(CLARITY_PROJECT_ID);
    document.head.appendChild(c);
  }

  function maskForms() {
    var fields = document.querySelectorAll("input, textarea, select");
    for (var i = 0; i < fields.length; i++) {
      fields[i].setAttribute("data-clarity-mask", "true");
    }
  }

  function banner() {
    if (document.getElementById("netra-consent")) return;
    var bar = document.createElement("div");
    bar.id = "netra-consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Analytics consent");
    bar.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:99999;" +
      "background:#101b15;color:#e8f0ea;border-top:1px solid #274436;" +
      "padding:14px 16px;display:flex;flex-wrap:wrap;gap:10px;" +
      "align-items:center;justify-content:center;" +
      "font:14px/1.5 system-ui,sans-serif;text-align:center";
    var text = document.createElement("span");
    text.textContent =
      "With your OK, this site uses Google Analytics 4 and Microsoft Clarity " +
      "(input masking on) to understand visits and improve the apps. " +
      "They load only after you accept. ";
    var link = document.createElement("a");
    link.href = "/legal/data-safety.html";
    link.textContent = "How Netra uses data";
    link.style.cssText = "color:#7fd6a8";
    text.appendChild(link);
    function btn(label, primary) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText =
        "padding:10px 18px;border-radius:10px;border:1px solid #2e5a44;" +
        "font:600 14px system-ui,sans-serif;cursor:pointer;min-height:44px;" +
        (primary
          ? "background:#1e6f50;color:#ffffff"
          : "background:transparent;color:#cfe3d6");
      return b;
    }
    var yes = btn("Accept", true);
    var no = btn("No thanks", false);
    yes.addEventListener("click", function () {
      try { localStorage.setItem(KEY, "yes"); } catch (e) {}
      bar.remove();
      maskForms();
      loadAnalytics();
    });
    no.addEventListener("click", function () {
      try { localStorage.setItem(KEY, "no"); } catch (e) {}
      bar.remove();
    });
    bar.appendChild(text);
    bar.appendChild(yes);
    bar.appendChild(no);
    document.body.appendChild(bar);
  }

  var saved = choice();
  if (saved === "yes") { maskForms(); loadAnalytics(); return; }
  if (saved === "no") { return; }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", banner);
  } else {
    banner();
  }
})();
