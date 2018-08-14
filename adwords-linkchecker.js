DATAINSIDE = (typeof DATAINSIDE != 'undefined') ? DATAINSIDE : {};
DATAINSIDE.Utils = DATAINSIDE.Utils || {};
DATAINSIDE.Utils.endsWith = DATAINSIDE.Utils.endsWith || function(_sString, _sEndsWith) {
  return (_sString.indexOf(_sEndsWith, _sString.length - _sEndsWith.length) !== -1);
};
DATAINSIDE.Utils.startsWith = DATAINSIDE.Utils.startsWith || function(_sString, _sStartsWith) {
  return (_sString.indexOf(_sStartsWith) === 0);
};

DATAINSIDE.Utils.setOrReplaceParameter = DATAINSIDE.Utils.setOrReplaceParameter || function(_sUrl, _sParameter, _sNewValueEncoded) {
 var re = new RegExp("([&\?])"+_sParameter+"=[^&]+(&?)", 'i');
 var sNewUrl = _sUrl;
 if (_sUrl.match(re)) {
  var n = _sUrl.indexOf("#");
  var sHash = (n === -1) ? "" : _sUrl.substring(n);
  if (null == _sNewValueEncoded) {
   sNewUrl = _sUrl.replace(re, "$1");
   if (DATAINSIDE.Utils.endsWith(sNewUrl, "&") === true) {
     sNewUrl = sNewUrl.substring(0, sNewUrl.length-1)+sHash;
   }
   if (DATAINSIDE.Utils.endsWith(sNewUrl, "?") === true) {
     sNewUrl = sNewUrl.substring(0, sNewUrl.length-1)+sHash;
   }
  } else {
   sNewUrl = _sUrl.replace(re, "$1"+_sParameter+"="+_sNewValueEncoded+"$2"+sHash);
  }
 } else if (null == _sNewValueEncoded) {
  return _sUrl;
 } else {
  var n = _sUrl.indexOf("?");
  if (n !== -1) {
   // ## http://example.com?aaa=bbb#xxxxx => http://example.com?newparam=newvalue&aaa=bbb#xxxxx
   sNewUrl = _sUrl.substring(0, n+1)+_sParameter+"="+_sNewValueEncoded+"&"+_sUrl.substring(n+1);
  } else {
   n = _sUrl.indexOf("#");
   if (n !== -1) {
    // ## http://example.com#xxxxx => http://example.com?newparam=newvalue#xxxxx
    sNewUrl = _sUrl.substring(0, n)+"?"+_sParameter+"="+_sNewValueEncoded+_sUrl.substring(n);
   } else {
    // ## http://example.com/abc.html => http://example.com/abc.html?newparam=newvalue
    sNewUrl = _sUrl+"?"+_sParameter+"="+_sNewValueEncoded;
   }
  }
 }
 return sNewUrl;
};

DATAINSIDE.Utils.getHttpDomain = DATAINSIDE.Utils.getHttpDomain || function(_sUrl) {
 return _sUrl.match(/(https?:\/\/.[^/]+)/)[1];
};


DATAINSIDE.AdWordsUtils = DATAINSIDE.AdWordsUtils || {};
DATAINSIDE.AdWordsUtils.logAllHeaders = DATAINSIDE.AdWordsUtils.logAllHeaders || function(_allHeaders) { // for debugging
  for (var prop in _allHeaders) {
    var myArray = [];
    if (Array.isArray(_allHeaders[prop]) ) {
      myArray=_allHeaders[prop];
    } else {
      myArray[0]=_allHeaders[prop];
    }
    myArray.forEach(function(el) {
      Logger.log(prop+ ": "+el);
    });
  }
};

DATAINSIDE.AdWordsUtils.UrlResult = DATAINSIDE.AdWordsUtils.UrlResult || function(_sUrl, _bAddParameterGclid) {
  var that = this;
  var nMaxChainLength = 5;
  that.m_sUrl = _sUrl;
  that.m_bRedirect = false;
  that.m_httpResponseLast = null;
  that.m_nRedirects = 0;  // 2 for example
  that.m_sRedirectChain = _sUrl; // http://schnelle-online.info/kalender --301--> http://www.schnelle-online.info/kalender --301--> http://www.schnelle-online.info/Kalender.html
  that.m_sRealDestinationUrl = null;
  that.m_error = null;
  that.m_bParameterValueReplaced= false;
  that.m_bFirstRequest = true;
  var regexpUrl = /{[^\&]+}/gi;

  (function redirectResult(_sUrl, _bFollowRedirects) {
   try {
     var sUrl = _sUrl.replace(regexpUrl, "data-inside_LinkChecker");
     that.m_bParameterValueReplaced = (_sUrl != sUrl);
     if ((true === that.m_bFirstRequest) && (true === _bAddParameterGclid) && (sUrl.indexOf("gclid=") === -1)){
       if (sUrl.indexOf("?") == -1) {
         sUrl += "?";
       } else {
         sUrl += "&";
       }
       sUrl += "";
     }
     that.m_bFirstRequest = false;
     that.m_sRealDestinationUrl = sUrl;
     var nResponseCode = -1;
     for (var i=0; i<3; i++) {
      that.m_httpResponseLast = UrlFetchApp.fetch(sUrl, {muteHttpExceptions: true, followRedirects: _bFollowRedirects} );
      nResponseCode = that.m_httpResponseLast.getResponseCode();
      if (nResponseCode != 0) {
        break;
      } else {
        Logger.log("nResponseCode = 0 for "+sUrl+" (followRedirects: "+_bFollowRedirects+")");
        Utilities.sleep(3000);
      }
     }
     if ((nResponseCode >= 300) && (nResponseCode < 400)) {
       //var sRedirectedUrl = that.m_httpResponseLast.getAllHeaders()['Location'];
       var sRedirectedUrl = that.m_httpResponseLast.getHeaders()['Location'];
       if (typeof sRedirectedUrl === 'undefined') {
         sRedirectedUrl = that.m_httpResponseLast.getHeaders()['location'];
       }
       //Logger.log("sRedirectedUrl 1: "+sRedirectedUrl);
       if ((null !== sRedirectedUrl) && (typeof sRedirectedUrl !== 'undefined')){
         if (DATAINSIDE.Utils.startsWith(sRedirectedUrl, "http") === false ) {
           if (DATAINSIDE.Utils.startsWith(sRedirectedUrl, "/") === true) {
             var sHttpDomain = DATAINSIDE.Utils.getHttpDomain(_sUrl);
             sRedirectedUrl = sHttpDomain+sRedirectedUrl;
           } else {
             that.m_sRedirectChain += " relative redirect to URL '"+sRedirectedUrl+"' not supported yet";
             that.m_error += " relative redirect to URL '"+sRedirectedUrl+"' not supported yet";
           }
         }
         // Logger.log("sRedirectedUrl 2: "+sRedirectedUrl);
         that.m_sRealDestinationUrl = sRedirectedUrl;
         if (_bFollowRedirects === false) {
           that.m_sRedirectChain += " -- "+nResponseCode+" --> "+sRedirectedUrl;
         } else {
           that.m_sRedirectChain += " --...--> "+sRedirectedUrl;
         }
         ++that.m_nRedirects;
         that.m_bRedirect = true;
         if (that.m_nRedirects < nMaxChainLength-1) {
           redirectResult(sRedirectedUrl, false);
         } else if (that.m_nRedirects < nMaxChainLength) {
           that.m_sRedirectChain += " --???--> ??? (target URL unknown)";
           that.m_error += " quite many redirects";
           redirectResult(sRedirectedUrl, true);
         } else {
           that.m_sRedirectChain += " --...--> endless loop?";
           that.m_error = "endless redirect loop?";
         }
       } else {
         // fallback
         that.m_sRedirectChain += " --???--> ??? (target URL unknown)";
         redirectResult(sUrl, true); // try it again with automatic redirect :-(
       }
     } else if (nResponseCode >= 400) {
       that.m_sRedirectChain += " -> "+nResponseCode+" Error";
       that.m_error += " "+nResponseCode+" Error";
     }
   } catch (e) {
     that.m_error = e;
     that.m_sRedirectChain += " -> Error "+e;
   }
  })(_sUrl, false);
  if (true === that.m_bParameterValueReplaced) {
    that.m_sRedirectChain += ' (parameter values like "{keyword}" replaced by "data-inside_LinkChecker")';
  }
/*
  if (true === _bAddParameterGclid) {
    that.m_sRedirectChain += ' (google analytics parameter gclid=data-inside_LinkChecker" added to URL)';
  }
*/
  this.toString = function() {
    return "m_sUrl: "+that.m_sUrl+"\r\nm_bRedirect: "+that.m_bRedirect+"\r\nm_nRedirects: "+that.m_nRedirects+"\r\nm_sRedirectChain: "+that.m_sRedirectChain+"\r\nm_error: "+that.m_error;
  };
};

DATAINSIDE.Collection = DATAINSIDE.Collection || {};
DATAINSIDE.Collection.Map = DATAINSIDE.Collection.Map || function() {
  var m_map = {};

  this.put = function(_sKey, _sValue) {
   m_map[_sKey]=_sValue;
  };

  this.get = function(_sKey) {
   return m_map[_sKey];
  };

  this.remove = function(_sKey) {
   delete m_map[_value];
  };

  this.contains = function(_sKey) {
   return (_sKey in m_map);
  };


};
DATAINSIDE.AdWordsApi = DATAINSIDE.AdWordsApi || {};

DATAINSIDE.AdWordsApi.logLabels = DATAINSIDE.AdWordsApi.logLabels || function() {
  Logger.log("Labels:");
  var labelIterator = AdWordsApp.labels().get();
  while (labelIterator.hasNext()) {
    var label = labelIterator.next();
    Logger.log("- "+label.getName());
  }
};

(function() { // ## LinkChecker
 var s_timeStart = new Date().getTime();
 var s_nBadUrls = 0;
 var s_sBadUrls = [];
 var s_mapUrl2ok = null;
 // var nMaxStatusCode = 300; // not implemented yet
 var s_settingsLinkChecker;
 var s_bAddParameterGclid = false;
 var s_bCheckDomains = true; // display URL = destination URL?
 var s_sAccountName = null;
 var s_sAccountUrl = null;

 DATAINSIDE.AdWordsApi.checkUrls = DATAINSIDE.AdWordsApi.checkUrls  || function(_settingsLinkChecker) {
  try {
   if (g_sMailAddress == "me@example.com") {
     Logger.log("Please define your mail address instead of me@example.com and restart again.");
     return;
   }
   s_settingsLinkChecker = _settingsLinkChecker;
   s_sAccountName = ((typeof g_sAccountName === 'undefined') || (g_sAccountName === "") || (g_sAccountName == "AdWords Konto-Name") || (g_sAccountName == "AdWords account name")) ? AdWordsApp.currentAccount().getName() : g_sAccountName;
   s_sAccountUrl = ((typeof g_sAccountUrl === 'undefined') || (g_sAccountUrl === "") || (g_sAccountUrl == "https://adwords.google.com/cm/CampaignMgmt?__u=123456789&__c=123456789")) ? "" : g_sAccountUrl;
   bCheckKeywords = ((typeof _settingsLinkChecker.checkKeywords === 'undefined') || (_settingsLinkChecker.checkKeywords === true)) ? true : false;
   bCheckAdsFinalUrl = (((typeof _settingsLinkChecker.checkAdsTargetUrl === 'undefined') && (typeof _settingsLinkChecker.checkAdsTargetUrls === 'undefined') && (typeof _settingsLinkChecker.checkAdsFinalUrls === 'undefined')) || (_settingsLinkChecker.checkAdsTargetUrl === true) || (_settingsLinkChecker.checkAdsTargetUrls === true) || (_settingsLinkChecker.checkAdsFinalUrls === true)) ? true : false;
   bCheckSitelinks = ((typeof _settingsLinkChecker.checkSitelinks === 'undefined') || (_settingsLinkChecker.checkSitelinks === true)) ? true : false;
   s_bCheckDomains = ((typeof _settingsLinkChecker.checkDomains === 'undefined') || (_settingsLinkChecker.checkDomains === true)) ? true : false;
   s_mapUrl2ok = new DATAINSIDE.Collection.Map();
   //if (s_settingsLinkChecker.reportRedirect !== true) {
   //  nMaxStatusCode = 400;
   //}
   var sLabel = getAndManageLabels();

   if (bCheckKeywords === true) {
     Logger.log("checkKeywords");
     checkUrlsImpl("keywords", sLabel);
   }
   if (bCheckAdsFinalUrl === true) {
     Logger.log("checkAdsFinalUrl");
     checkUrlsImpl("ads", sLabel);
   }
   if (bCheckSitelinks === true) {
     Logger.log("checkSitelinks");
     checkUrlsImpl("sitelinks", sLabel);
   }
   Logger.log("bad URLs: "+s_nBadUrls);
   if (s_nBadUrls > 0) {
     sendReportWithErrors();
   }
  } catch (e) {
   Logger.log(e+" (Line "+e.lineNumber+")");
   //if (e.message.indexOf("The label zz") === 0) {
   if ((e.message.indexOf("The label zz") === 0) || (e.message.indexOf("Failed to read from AdWords. Please wait a bit and try again.") === 0)) {
    Logger.log("AdWords Scripts bug (Google knows this bug and is about to fix it. Please wait for the bugfix.): Lable was not created. "+e);
   } else {
    MailApp.sendEmail(g_sMailAddress, "!!!! Exception in Script 'LinkChecker de Luxe' - "+AdWordsApp.currentAccount().getName(), "Account "+AdWordsApp.currentAccount().getName()+":\r\n "+e+"\r\nLine: "+e.lineNumber+"\r\n!!!!!! Please report this problem to holger.schulz@data-inside.de with script logs! Thanks");
   }
   throw e;
  }    
 };

 var sendReportWithErrors = function(_sPeriod) {
   var emailBody = [];
   emailBody.push("Resumen para la cuenta " + s_sAccountName + " " + AdWordsApp.currentAccount().getCustomerId() + " "+s_sAccountUrl+"\n");

   for (var i=0; i < s_sBadUrls.length; i++) {
    var sUrl = s_sBadUrls[i];
    emailBody.push(sUrl+"\n");
   }

  if (true === s_bAddParameterGclid) {
    emailBody.push("");
  }


  MailApp.sendEmail(g_sMailAddress, "ALERT - Revisión de URLs en  "+ s_sAccountName, emailBody.join("\n"));
 };

 var checkUrlsImpl = function (_sCheck, _sLabel) {
  var now = new Date().getTime();
  if (now - s_timeStart > 1500000) { // (25*60*1000 = 25 Minuten)
     // don'r report error any more ++s_nBadUrls;
     return true;
  }

  var bLabelBadUrl = AdWordsApp.labels().withCondition("Name = 'zz_badurl'").get().hasNext();
  var iterator = null;
  if (("keywords" == _sCheck) || ("ads" == _sCheck)) {
   var selector = ("keywords" == _sCheck) ? AdWordsApp.keywords() : AdWordsApp.ads();
   iterator = selector
    .withCondition("Status = ENABLED")
    .withCondition("AdGroupStatus = ENABLED")
    .withCondition("CampaignStatus = ENABLED")
    .withCondition("LabelNames CONTAINS_NONE ['"+_sLabel+"']")
    // .withCondition("DestinationUrl STARTS_WITH_IGNORE_CASE 'h'")
    // .orderBy("DestinationUrl")
    .orderBy("CampaignName")
    .orderBy("AdGroupName")
    .get();
   if (!iterator.hasNext()) {
    Logger.log("nothing to do");
    return false;
   }
  } else if ("sitelinks" == _sCheck) {
   var selector = AdWordsApp.extensions().sitelinks();
   iterator = selector.get();
  }

  var sUrl = "";
  var sDisplayUrl = null;
  var sDisplayDomain = null;
  var nCheckContentLength = (typeof s_settingsLinkChecker.reportFoundPhrases === 'undefined') ? 0 : s_settingsLinkChecker.reportFoundPhrases.length;
  var nPause = (typeof s_settingsLinkChecker.pause === 'undefined') ? 0 : parseInt(s_settingsLinkChecker.pause, 10);
  var nMaxErrors = (typeof s_settingsLinkChecker.maxErrors === 'undefined') ? 100 : parseInt(s_settingsLinkChecker.maxErrors, 10);
  var regexpDomain = /^.*?([^\./]+\.[a-z]+)(?:[\/?#]|$)/i;

  s_bAddParameterGclid = (typeof s_settingsLinkChecker.addParameterGclid === 'undefined') ? false : s_settingsLinkChecker.addParameterGclid;
  while (iterator.hasNext()) {
    if (s_nBadUrls >= nMaxErrors) {
      s_sBadUrls.push("Too many errors! Just first "+nMaxErrors+" will be reported");
      break;
    }
    if (now - s_timeStart > 1500000) { // (25*60*1000 = 25 Minuten)
      //++s_nBadUrls;
      //s_sBadUrls.push("Die Prüfung der URLs wurde abgebrochen, da die Ausführung das von Google vorgegebene Zeitfenster überschreitet. Wir arbeiten an einer Lösung!");
      break;
    }
    var entity = iterator.next();
    var result = checkUrl(entity, _sLabel, now, _sCheck, nCheckContentLength, nPause, nMaxErrors, regexpDomain, s_bAddParameterGclid);
    if (null === result) {
      continue;
    }
  }
  return true;
 };












 var checkUrl = function (entity, _sLabel, now, _sCheck, nCheckContentLength, nPause, nMaxErrors, regexpDomain, s_bAddParameterGclid) {
  var bLabelBadUrl = AdWordsApp.labels().withCondition("Name = 'zz_badurl'").get().hasNext();
  var bSupportLable = (_sCheck != "sitelinks");
  var sUrl = "";
  var sDisplayUrl = null;
  var sDisplayDomain = null;

  //sUrl = entity.getDestinationUrl();
  var sFinalUrl = getFinalUrl(entity);
  if (null === sFinalUrl) {
    // ## Keyword without URL
    return null;
  }
  var sMobileUrl = entity.urls().getMobileFinalUrl();
  var sUrls = [];
  sUrls.push(sFinalUrl);
  if (null !==sMobileUrl) {
    sUrls.push(sMobileUrl);
  }
  for (var i=0; i<sUrls.length; i++) {
   sUrl = sUrls[i]; // Destination, Final or MobileFinal
   var bRemoveParameter = (typeof s_settingsLinkChecker.removeParameter === 'undefined') ? false : ((s_settingsLinkChecker.removeParameter.length > 0) && (sUrl.indexOf("?") !== -1));
   if (true === bRemoveParameter) {
     //Logger.log("Vor remove : "+sUrl);
     for (var i=0; i<s_settingsLinkChecker.removeParameter.length; i++) {
       var sParameter = s_settingsLinkChecker.removeParameter[i];
       sUrl = DATAINSIDE.Utils.setOrReplaceParameter(sUrl, sParameter, null);
     }
     //Logger.log("Nach remove: "+sUrl);
   }

   var sSetUrl = sUrl;
   if ((s_bCheckDomains === true) && (_sCheck == "ads")) {
     sDisplayUrl = entity.getDisplayUrl();
     if (null !== sDisplayUrl) { // null for expanded text ads
      sDisplayDomain = (regexpDomain.exec(sDisplayUrl)[1]).toLowerCase();
      sSetUrl = sDisplayDomain+sUrl; // check again if destination URL belongs to a different display URL domain.
     }
   }
   if (s_mapUrl2ok.get(sSetUrl) === false) {
     // ## Error for this sSetUrl already found => set zz_badurl
     if (bSupportLable === true) {
      if (bLabelBadUrl === false) {bLabelBadUrl=true;createBadUrlLabel();}
      entity.applyLabel("zz_badurl");
     }
   } else if (s_mapUrl2ok.contains(sSetUrl) === false) {
     s_mapUrl2ok.put(sSetUrl, true);
     urlResult = new DATAINSIDE.AdWordsUtils.UrlResult(sUrl, s_bAddParameterGclid);
     //Logger.log("URL: "+urlResult.m_sRedirectChain);
     var nResponseCode = (urlResult.m_httpResponseLast !== null) ? urlResult.m_httpResponseLast.getResponseCode() : 999;
     var then = new Date().getTime();
     if ((0 !== nPause) && ((nPause - (then - now)) > 0)) {
      Utilities.sleep(nPause - (then - now));
     }
     now = new Date().getTime();

     if (nResponseCode == 200) {
       //var bFoundPhrase = false;
       var bBadUrl = false;
       if ((s_bCheckDomains === true) && (_sCheck == "ads")) {
         var sDestinationDomain = (regexpDomain.exec(urlResult.m_sRealDestinationUrl)[1]).toLowerCase();
         if ((null !== sDisplayDomain) && (sDisplayDomain != sDestinationDomain)) {
           ++s_nBadUrls;
           bBadUrl = true;
           s_mapUrl2ok.put(sSetUrl, false);
           if (bSupportLable === true) {
            if (bLabelBadUrl === false) {bLabelBadUrl=true;createBadUrlLabel();}
            entity.applyLabel("zz_badurl");
           }
           s_sBadUrls.push("Display domain name '"+sDisplayUrl+"' is different than in (redirected) destination URL "+urlResult.m_sRedirectChain);
           Logger.log("     Display domain name '"+sDisplayUrl+"' is different than in (redirected) destination URL "+urlResult.m_sRedirectChain);
         }
       }
       if (s_bAddParameterGclid === true) {
         if (urlResult.m_sRealDestinationUrl.indexOf("") === -1) {
           if (bBadUrl === false) {
             bBadUrl = true;
             ++s_nBadUrls;
             //if (bLabelBadUrl === false) {bLabelBadUrl=true;createBadUrlLabel();}
             //entity.applyLabel("zz_badurl");
           }
           s_mapUrl2ok.put(sSetUrl, false);
           if (bSupportLable === true) {
            if (bLabelBadUrl === false) {bLabelBadUrl=true;createBadUrlLabel();}
            entity.applyLabel("zz_badurl");
           }
           var sInfo = (_sCheck == "sitelinks") ? " (sitelink '"+entity.getLinkText()+"')" : "";
           s_sBadUrls.push("Parámetro 'gclid' perdido:"+sInfo+": "+urlResult.m_sRedirectChain);
           Logger.log("Google Analytics tracking parameter 'gclid' got lost in redirection chain"+sInfo+": "+urlResult.m_sRedirectChain);
         }
       }
       if (nCheckContentLength !== 0) {
         //if ((nResponseCode >= 300) && (
         var sText = urlResult.m_httpResponseLast.getContentText();
         for (var i=0; i < nCheckContentLength; i++){
           var sPhrase = s_settingsLinkChecker.reportFoundPhrases[i];
           if (sText.indexOf(sPhrase) !== -1) {
             if (bBadUrl === false) {
               bBadUrl = true;
               ++s_nBadUrls;
             }
             s_mapUrl2ok.put(sSetUrl, false);
             if (bSupportLable === true) {
              if (bLabelBadUrl === false) {bLabelBadUrl=true;createBadUrlLabel();}
              entity.applyLabel("zz_badurl");
             }
             var sInfo = (_sCheck == "sitelinks") ? " (sitelink '"+entity.getLinkText()+"')" : "";
             s_sBadUrls.push("'"+sPhrase+"' found in "+urlResult.m_sRedirectChain+sInfo);
             Logger.log("     Phrase error: '"+sPhrase+"' found in "+urlResult.m_sRedirectChain+sInfo);
             //bFoundPhrase = true;
             break;
           }
         }
       }
     } else {
       ++s_nBadUrls;
       s_mapUrl2ok.put(sSetUrl, false);
       if (bSupportLable === true) {
        if (bLabelBadUrl === false) {bLabelBadUrl=true;createBadUrlLabel();}
        entity.applyLabel("zz_badurl");
       }
       var sInfo = (_sCheck == "sitelinks") ? " (sitelink '"+entity.getLinkText()+"')" : "";
       if (nResponseCode === 999) { // urlResult.m_error !== null) {
         s_sBadUrls.push(nResponseCode+": "+urlResult.m_sRedirectChain+" (error "+urlResult.m_error+")"+sInfo);
       } else {
         s_sBadUrls.push(nResponseCode+": "+urlResult.m_sRedirectChain+sInfo);
       }
     }
   }
  }
  if (bSupportLable === true) {entity.applyLabel(_sLabel);} // mark as checked today (explicit this or another keyword/ad with the 'same' URL
 };

 var getAndManageLabels = function() {
   var sTimeZone = AdWordsApp.currentAccount().getTimeZone();
   var time = new Date();
   var sDate = Utilities.formatDate(time, sTimeZone, "yyyyMMdd");
   var sLabelToday = "zzURLchecked"+sDate;

   // ## 1. check for first run today
   var labelIterator = AdWordsApp.labels().withCondition("Name = '"+sLabelToday+"'").get();
   var bFirstRunToday = !labelIterator.hasNext();
   var labelIteratorBadUrl = AdWordsApp.labels().withCondition("Name = 'zz_badurl'").get();

   // ## delete old labels
   if (true == bFirstRunToday) {
     var labelIterator = AdWordsApp.labels().withCondition("Name STARTS_WITH 'zzURLchecked'").get();
     while (labelIterator.hasNext()) {
       var label =  labelIterator.next();
       // ## found an old label
       //Logger.log("remove old label "+label.getName());
       label.remove();
     }
     AdWordsApp.createLabel(sLabelToday, "data-inside LinkChecker", "white");
     if (labelIteratorBadUrl.hasNext()) {
      var label =  labelIteratorBadUrl.next();
      label.remove(); // re
     }
     //AdWordsApp.createLabel("zz_badurl", "data-inside LinkChecker", "white");
   } else {
    //if (labelIteratorBadUrl.hasNext() == false) {
    // //Logger.log("createLabel zz_badurl");
    // AdWordsApp.createLabel("zz_badurl", "data-inside LinkChecker", "white");
    //}
   }
   //DATAINSIDE.AdWordsApi.logLabels();
   return sLabelToday;
 };

 var createBadUrlLabel = function() {
  AdWordsApp.createLabel("zz_badurl", "data-inside LinkChecker", "white");
 };

 function getFinalUrl(el) {
  var urls = el.urls();
  var sFinalUrl = urls.getFinalUrl();
  if ((null === sFinalUrl) && (typeof(el.getDestinationUrl) === "function")) {
   sFinalUrl = el.getDestinationUrl();
  }
  if ((null != sFinalUrl) && ((sFinalUrl.indexOf("{unescapedlpurl}")!=-1) || (sFinalUrl.indexOf("{escapedlpurl}")!=-1) || (sFinalUrl.indexOf("{lpurl")!=-1))) {
    sFinalUrl = null; // unable to check these urls
  }
  return sFinalUrl;
 }
})(); // ## LinkChecker