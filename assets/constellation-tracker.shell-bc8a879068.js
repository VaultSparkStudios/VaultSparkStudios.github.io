/* Legacy constellation records are retained for Spark. No unsolicited UI. */
(function(){'use strict';window.VSConstellations={achievements:function(){try{var ids=JSON.parse(localStorage.getItem('vs_cst_unlocked')||'[]');return Array.isArray(ids)?ids.filter(x=>typeof x==='string'):[];}catch(_){return [];}}};})();
