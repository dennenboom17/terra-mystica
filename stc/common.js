var TM = TM || {
    params: null,
};

var stored_exception = null;

function handleException (e) {
    stored_exception = e;
    var p = document.getElementById("error");
    p.updateText(e);

    if (e.stack) {
        console.error(e.stack);
        p.insert(new Element("div",
                             {"class": "error-details"}).updateText(e.stack));
    } else {
        console.error(e.stack);
    }
}

var moveRequired = false;
var updateTitle = true;
var updateFavicon = true;

function disableDescendants(parent) {
    parent.descendants().each(function (elem) {
        elem.disabled = true;
    });
}

function enableDescendants(parent) {
    parent.descendants().each(function (elem) {
        elem.disabled = false;
    });
}

function setTitle() {
    try {
        var title = "TM";
        if (TM.params) {
            if (TM.params.game) {
                title += " - " + TM.params.game;
            }
            if (TM.params.faction) {
                title += " / " + TM.params.faction;
            }
        }
        if (moveRequired) {
            title = "*** " + title;
            setFavicon("/favicon.ico");
        } else {
            setFavicon("/favicon-inactive.ico");
        }
        if (updateTitle) {
            document.title = title;
        }
    } catch (e) {
    }
}

function setFavicon(url) {
    if (!updateFavicon) {
        return;
    }

    var icon = $("favicon");
    var new_icon = icon.cloneNode(true);
    new_icon.setAttribute('href', url);
    icon.parentNode.replaceChild(new_icon, icon);
}

function getCSRFToken() {
    var match = document.cookie.match(/csrf-token=([^ ;]+)/);
    if (match) {
        return match[1];
    } else {
        return "invalid";
    }
}

function fetchGames(div, mode, status, handler, args) {
    if (!loggedIn()) {
        $(div).update("Not logged in (<a href='/login/'>login</a>)");
        return;
    }

    $(div).update("... loading");
    new Ajax.Request("/app/list-games/", {
        parameters: {
            "mode": mode,
            "status": status,
            "args": args,
            "csrf-token": getCSRFToken()
        },
        method:"post",
        onComplete: function(transport) {
            var resp = transport.responseText.evalJSON();
            try {
                if (!resp.error || !resp.error.size()) {
                    handler(resp.games, div, mode, status);
                } else {
                    $(div).update(resp.error.join(', '));
                }
            } catch (e) {
                handleException(e);
            };
        }
    });
}

function fetchChangelog(handler) {
    new Ajax.Request("/data/changes.json", {
        parameters: {
            "cache-token": new Date()
        },
        method: "get",
        onSuccess: function(transport){
            try {
                var resp = transport.responseText.evalJSON();
                if (!resp.error) {
                    handler(resp.news);
                }
            } catch (e) {
                handleException(e);
            };
        }
    });
}

function showChangelog(data, div, heading, types, max_age) {
    if (max_age) {
        data = data.select(function (record) {
            return (new Date() - new Date(record.date)) / 1000 < max_age;
        });
    }

    if (data.size() > 0)  {
        div.insert(new Element("h4").update(heading));
    }

    data.each(function (record) {
        var e = new Element("div", {"class": "changelog-entry"});
        div.insert(e);
        
        if (!types[record.type || "change"]) {
            return;
        }

        var header = new Element("b");

        var title = record.title;
        if (record.link) {
            var link = new Element("a", {"href": record.link});
            link.insert(title);
            title = link;
        }

        header.insert(record.date + " - ");
        header.insert(title);

        e.insert(header);
        e.insert(new Element("p").update(record.description));
    });
}

function seconds_to_pretty_time(seconds, remainder_unit) {
    var subamount = '';
    var amount;
    var unit;

    var hour = 3600;
    var day = 24*hour;
    var year = day*365;
    var month = day*30;

    if (seconds >= year) {
        amount = Math.floor(seconds / year);
        unit = "year";
        var remainder = (seconds - amount * year) % day;
        if (remainder >= month) {
            subamount = ' ' + seconds_to_pretty_time(remainder);
        }
    } else if (seconds >= month) {
        amount = Math.floor(seconds / month);
        unit = "month";
        var remainder = seconds - amount * month;
        if (remainder >= day) {
            subamount = ' ' + seconds_to_pretty_time(remainder);
        }
    } else if (seconds >= day) {
        amount = Math.floor(seconds / day);
        unit = "day";
        if (remainder_unit == "hour") {
            var remainder = seconds - amount * day;
            if (remainder >= hour) {
                subamount = ' ' + seconds_to_pretty_time(remainder);
            }
        } else if (remainder_unit == "minute") {
            var remainder = seconds - amount * day;
            if (remainder >= 60) {
                subamount = ' ' + seconds_to_pretty_time(remainder);
            }
        }
    } else if (seconds >= hour) {
        amount = Math.floor(seconds / hour);
        unit = "hour";
        if (remainder_unit == "minute") {
            var remainder = seconds - amount * hour;
            if (remainder >= 60) {
                subamount = ' ' + seconds_to_pretty_time(remainder);
            }
        }
    } else if (seconds > 60) {
        amount = Math.floor(seconds / 60);
        unit = "minute";
    } else {
        amount = Math.floor(seconds);
        unit = "second";
    }
    if (amount > 1) { unit += "s" }
    return amount + " " + unit + subamount;
}

function loggedIn() {
    return document.cookie.match(/session-username=([A-Za-z0-9._-]+)/);
}

function renderSidebar(id) {
	var sidebarSection = function(title, renderer) {
        var sec = new Element("div", {"class" : "list-group"}).updateText(title);                 
	//sec.insert(new Element("div", {"class": "list-group"}));
	
        renderer(function(link, text, accesskey) {
           var p = new Element ("a");
	   
            if (document.location.pathname == link) {
	       p.insert(new Element("a", {"href": link, "class" : "list-group-item active"}).update(text));
	       
            } else {
               p.insert(new Element("a", {"href": link, "class" : "list-group-item",
                                           "accesskey": accesskey}).update(text));
            }
            
            sec.insert(p);
        });

        $(id).insert(sec);
    }

    if (!loggedIn()) {
        sidebarSection("Your Account", function (insertLink) {
            insertLink("/", "Home", "h");
            insertLink("/login.html", "Login");
            insertLink("/register/request.html", "Register");
        });
    } else {
        var username = loggedIn()[1];

        sidebarSection("Your Account", function (insertLink) {
            insertLink("/", "Home", "h");
            insertLink("/settings/", "Settings");
            insertLink("/player/" + username, "Profile");
            insertLink("/app/logout/", "Logout");
        });

        sidebarSection("Games", function (insertLink) {
            insertLink("/joingame.html", "Join Game");
            insertLink("/newgame.html", "New Game");
        });
    }

    sidebarSection("Site Info", function(insertLink) {
        insertLink("/about.html", "About");
        insertLink("/usage.html", "Help");
        insertLink("/stats.html", "Statistics");
        insertLink("/ratings.html", "Ratings");
        insertLink("/changes.html", "Changes");
        insertLink("/blog.html", "Blog");
    });

    sidebarSection("Related", function (insertLink) {    
        insertLink("http://tmtour.org/", "Tournament");
        insertLink("http://lodev.org/tmai/", "TM AI");
    });
}

function makeTextSpan(content, klass) {
    var attrs = klass ? { 'class': klass } : {};
    var elem = new Element('span', attrs);
    elem.updateText(content);
    return elem;
}

{
    Element.addMethods({
        updateText: function(element, text) {
            element.textContent = text;
            return element;
        },
        insertTextSpan: function(element, text, klass) {
            return element.insert(makeTextSpan(text, klass));
        },
        clearContent: function(element) {
            element.innerHTML = "";
        },
    });
}                      

var isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

// Colors

function setFactionStyleForElement(element, faction_name) {
    if (factionColor[faction_name]) {
        element.style.backgroundColor = bgcolors[factionColor[faction_name]];
        element.style.color = contrastColor[factionColor[faction_name]];
    }
}

function factionTableCell(faction_name) {
    var td = new Element("td").updateText(faction_name);
    setFactionStyleForElement(td, faction_name);
    return td;
}

var colors = {
    red: '#e04040',
    green: '#40a040',
    yellow: '#e0e040',
    brown: '#a06040',
    blue: '#2080f0',
    black: '#000000',
    white: '#ffffff',
    gray: '#808080',
    ice: '#f0f8ff',
    volcano: '#f0a020',
    orange: '#f0c040',
    player: '#c0c0c0',
    activeUI: '#8f8'
};

var bgcolors = {
    red: '#f08080',
    green: '#80f080',
    yellow: '#f0f080',
    blue: '#60c0f0',
    black: '#404040',
    white: '#ffffff',
    gray: '#c0c0c0',
    brown: '#b08040',
    ice: '#e0f0ff',
    volcano: '#f0c060',
    player: '#404040'
};

var contrastColor = {
    red: '#000',
    green: '#000',
    yellow: '#000',
    blue: '#000',
    black: '#c0c0c0',
    white: '#000',
    gray: '#000',
    brown: '#000',
    ice: '#000',
    volcano: '#000',
    player: '#000'
};

var factionColor = {
    chaosmagicians: 'red',
    giants: 'red',
    nomads: 'yellow',
    fakirs: 'yellow',
    halflings: 'brown',
    cultists: 'brown',
    alchemists: 'black',
    darklings: 'black',
    swarmlings: 'blue',
    mermaids: 'blue',
    witches: 'green',
    auren: 'green',
    dwarves: 'gray',
    engineers: 'gray',
    icemaidens: 'ice',
    yetis: 'ice',
    acolytes: 'volcano',
    dragonlords: 'volcano',
};

