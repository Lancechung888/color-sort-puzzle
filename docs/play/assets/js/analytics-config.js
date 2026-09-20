/**
 * ColorTube Sort — analytics config (GA4).
 * Leave MEASUREMENT_ID empty until a real GA4 property exists.
 * Do NOT invent a fake G- id; console sink stays active either way.
 */
(function (global) {
  'use strict';
  global.ColorTubeAnalyticsConfig = {
    /** Set to a real "G-XXXXXXXX" from GA4 Admin → Data streams when ready. */
    MEASUREMENT_ID: '',
  };
})(typeof window !== 'undefined' ? window : globalThis);
