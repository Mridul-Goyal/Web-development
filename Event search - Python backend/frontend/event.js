
// var serverUrl = "http://127.0.0.1:5000/";
var serverUrl = "https://webtech-project-377619.wl.r.appspot.com/";
var tmRootUrl = "https://app.ticketmaster.com/discovery/v2/";
var ipinfoUrl = "https://ipinfo.io/104.32.173.158?token=2acdea5f1f8da1";

var tmkey = "i2cAX0G7nhCvi0wRkcX9y9olc3nsAvE1";
var currentLocation = "";

function disableLocInput() {
    var autoLoc = document.getElementById("locCheck");
    var location = document.getElementById("locInput");

    if (autoLoc.checked == true) {
        location.style.display = "none";
        location.required = false;
        fetch(ipinfoUrl)
            .then((response) => response.json())
            .then((data) => {
                currentLocation = data.loc
            });
    } else {
        location.style.display = "block";
        location.required = true;
    }
    
}

function requestSearch() {
    var form = document.getElementById("eventForm");
    var data = new FormData(form);
    var finalUrl = serverUrl + "search?";
    var autoLoc = document.getElementById("locCheck");
    var location = data.get("locInput");
    var locCheck = "off"
    if (autoLoc.checked == true) {    
        location = currentLocation;
        locCheck = "on";
    } 
    else if(data.get("locInput") == undefined || data.get("locInput") == "") {
        return;
    }
    for (let [key, value] of data) {
        if (key == "locInput" || key == "locCheck") {    
            continue;
        }
        if (key == "distance" && value == "") {
            value = "10";
        }
        finalUrl += key + "=" + value + "&";
    }
    finalUrl += "locInput=" + location + "&locCheck=" + locCheck; 
    fetch(finalUrl)
    .then((response) => response.json())
    .then((data) => {
        delRows();
        var noRecord = document.getElementById('NoResults');
        noRecord.style.display = 'none';
        var getTable = document.getElementById('tmResults');
        getTable.style.display = 'block';
        var getEventView = document.getElementById('eventDetails');
        getEventView.style.display = 'none';
        var getVenueLink = document.getElementById('venueLink');
        getVenueLink.style.display = 'none';
        var getVenueView = document.getElementById('venueDetails');
        getVenueView.style.display = 'none';
        if (data.data[0] == 'No Results Found'){
            displayEmpty();
        }
        else {
            data.data.forEach(element => {
                addRow(element)
            });
        }  
        
    })
    .catch((err) => console.log(err));
    
}

function addRow(ele) {
    var table = document.getElementById('tmResults');
    var result = "<tr>";
    if ('localDate' in ele) {
        result += "<td style='width: 155px;'><div> " + ele['localDate'] + "</div></td>";
    } else {
        result += "<td style='width: 155px;'><div></div></td>";
    }

    if ('image' in ele) {
        result += "<td style='width: 155px;'><img class = 'row-img' src = '" + ele['image'] + "'></img></td>";
    } else {
        result += "<td style='width: 155px;'></td>";
    }

    if ('eventName' in ele) {
        if ('eventId' in ele) {
            result += `<td style='width: 610px;'> <div class='t_hover' id='` + ele['eventName'] +  `' onClick="fetchEventDetails('` + ele['eventId'] + `')">` + ele['eventName'] + `</div></td>`; 
        } else {
            result += "<td style='width: 610px;'> <div id='" + ele['eventName'] +  "'>" + ele['eventName'] + "</div></td>";
        }
    } else {
        result += "<td style='width: 610px;'></td>";
    }

    if ('genre' in ele) {
        result += " <td style='width: 130px;'><div>" + ele['genre'] + "</div></td>";
    } else {
        result += " <td style='width: 130px;'></td>";
    }

    if ('venue' in ele) {
        result += "<td style='width: 250px;'><div>" + ele['venue'] + "</div></td>";
    } else {
        result += "<td style='width: 250px;'></td>";
    }

    result += "</tr>";
    table.innerHTML += result;
}

function delRows(){
    var table = document.getElementById('tmResults');
    var numRows = table.rows.length;
    while (numRows > 1){
        table.deleteRow(numRows-1);
        numRows--;
    }
}

function sortColumn(rowName){
    var needSwitch = true;
    var i, num;
    if (rowName == "event") num = 2;
    if (rowName == "genre") num = 3;
    if (rowName == "venue") num = 4;
    while (needSwitch){
        var numRows = document.getElementById("tmResults").rows;
        needSwitch = false;
        for (i=1; i < (numRows.length-1); i++){
            var curSwitch = false;
            var one = numRows[i].getElementsByTagName("TD")[num].innerHTML.toLowerCase();
            var two = numRows[i+1].getElementsByTagName("TD")[num].innerHTML.toLowerCase();
            if(one > two){
                curSwitch = true;
                break;
            }
        }
        if (curSwitch) {
            numRows[i].parentNode.insertBefore(numRows[i+1], numRows[i]);
            needSwitch = true;
        }
    }
}


function fetchEventDetails(id){
    var getDiv = document.getElementById('eventDetails');
    getDiv.style.display = 'none';
    getDiv = document.getElementById('venueLink');
    getDiv.style.display = 'none';
    getDiv = document.getElementById('venueDetails');
    getDiv.style.display = 'none';
    var url = serverUrl + "eventdetails?eventId=" + id;
    fetch(url)
    .then((response) => response.json())
    .then((data) => {
        displayEventDetails(data.data);
        displayVenueLink(data.data);
        var getDiv = document.getElementById('eventDetails');
        getDiv.scrollIntoView(true);
    })
    .catch((err) => console.log(err));
}

function displayEventDetails(data){
    var left = leftEventDetails(data);

    let nameVal = "";
    if (data['name'] != undefined && data['name'] != "")
        nameVal = data['name'];

    let template = `
    <div id="eventName">` + nameVal + `</div> <p>
    <table id="ev_table">
    <tr>
    <td id="ev_left"><div id="leftEventDetails">` + left + `</div> <p> </td>
    <td id="ev_right"><div id="rightEventDetails">`
    if(data['seatmap'] != undefined && data['seatmap'] != "") {
        template += `<img id="ev_seatmap" src="` + data['seatmap'] + `"></img>`
    }
    
    template += `</div> </td>
    </tr>
    </table>`;

    var getDiv = document.getElementById('eventDetails');
    getDiv.innerHTML = template;
    getDiv.style.display = 'block';
}

function leftEventDetails(data){
    var result = '';
    if ('date' in data) { result += "<div id='ev_date'> <span class='ev_headings'>Date </span> <br> <span class='ev_data'>" + data['date'] + "</span></div><p>" };
    if ('artist' in data){ 
        if ('artist_url' in data) {
            result += "<div id='ev_artist'> <span class='ev_headings'> Artist/Team </span> <br> <span class='ev_data'> <a href='" + data['artist_url'] + "' target='_blank'>" + data['artist'] + "</a></span></div><p>"
        } else {
            result += "<div id='ev_artist'> <span class='ev_headings'> Artist/Team </span> <br> <span class='ev_data'>" + data['artist'] + "</span></div><p>"
        }
    };
    if ('venue' in data) { result += "<div id='ev_venue'> <span class='ev_headings'> Venue </span> <br> <span class='ev_data'>" + data['venue'] + "</span></div><p>"};
    if ('genre' in data) { result += "<div id='ev_genre'> <span class='ev_headings'> Genres </span> <br> <span class='ev_data'>" + data['genre'] + "</span></div><p>"};
    if ('price' in data) { result += "<div id='ev_price'> <span class='ev_headings'> Price Ranges </span> <br> <span class='ev_data'>" + data['price'] + "</span></div><p>"};
    if ('ticketStatus' in data) { 
        if (data['ticketStatus'] == 'onsale') {
            result += "<div id='ev_tstatus'> <span class='ev_headings'> Ticket Status </span> <br> <span class='ev_data' id='ev_ticketSt' style='background-color:green;'>On Sale</span></div><p>"
        } else if (data['ticketStatus'] == 'offsale') {
            result += "<div id='ev_tstatus'> <span class='ev_headings'> Ticket Status </span> <br> <span class='ev_data' id='ev_ticketSt' style='background-color:red;'>Off Sale</span></div><p>"
        } else if (data['ticketStatus'] == 'canceled' || data['ticketStatus'] == 'cancelled' ) {
            result += "<div id='ev_tstatus'> <span class='ev_headings'> Ticket Status </span> <br> <span class='ev_data' id='ev_ticketSt' style='background-color:black;'>Cancelled</span></div><p>"
        } else if (data['ticketStatus'] == 'postponed') {
            result += "<div id='ev_tstatus'> <span class='ev_headings'> Ticket Status </span> <br> <span class='ev_data' id='ev_ticketSt' style='background-color:orange;'>Postponed</span></div><p>"
        } else if (data['ticketStatus'] == 'rescheduled') {
            result += "<div id='ev_tstatus'> <span class='ev_headings'> Ticket Status </span> <br> <span class='ev_data' id='ev_ticketSt' style='background-color:orange;'>Rescheduled</span></div><p>"
        }
    };
    if ('buyUrl' in data) { result += "<div id='ev_buy'> <span class='ev_headings'> Buy Tickets At: </span> <br> <span class='ev_data'> <a href='" + data['buyUrl'] + "' target='_blank'>Ticketmaster</a></span></div><p>"};

    return result;
}

function displayVenueLink(data){
    const template = `
    <div id="vl_text"> Show Venue Details </div>
    <div id="vl_arrow" onclick="fetchVenueDetails('` + data['venue'] + `')"> </div>
    `;
    var getDiv = document.getElementById('venueLink');
    getDiv.style.display = 'block';
    getDiv.innerHTML = template;

}

function fetchVenueDetails(name){
    var url = serverUrl + "venuedetails?venue=";
    var temp = name.replace(' ', '%20');
    url += temp;
    fetch(url)
    .then((response) => response.json())
    .then((data) => {
        if (data.data[0] == 'No Results Found'){
            displayEmptyVenue();
        } else {
            displayVenueDetails(data.data);
        }
    })
    .catch((err) => console.log(err));
}

function displayVenueDetails(data){

    let googleLink = "";
    if (data['googleLink'] != undefined && data['googleLink'] != "")
         googleLink = `<a href="`+ data['googleLink'] + `" target="_blank">`;

    let moreLink = "";
    if (data['upcoming'] != undefined && data['upcoming'] != "")
        moreLink = `<a href="`+ data['upcoming'] + `" target="_blank">`;
    
    let nameVal = "";
    if (data['name'] != undefined && data['name'] != "")
        nameVal = data['name'];
    
    let addVal = "";
    if (data['address'] != undefined && data['address'] != "")
        addVal = `<span>` + data['address'] + `</span><br>`;
    
    let cityVal = "";
    if (data['city'] != undefined && data['city'] != "")
        cityVal = `<span>` + data['city'] + `</span><br>`;
    
    let pinVal = "";
    if (data['pincode'] != undefined && data['pincode'] != "")
        pinVal = `<span>` + data['pincode'] + `</span>`;
    
    let template = `
    <div id="inner_venue">
    <div id="v_name"> <div id="v_nameText">` + nameVal + `</div></div>
    <div id="v_image" style="visibility: hidden;"> <img id="v_imgTag" src="` + data['vimage'] + `"> </img></div>
    <table id="venue_table">
    <tr>
        <td id="vtable_left" style="width: 300px;">
            <table id="v_leftIn">
                <tr>
                <td id="v_add" style="width:50px;">Address: <td>
                <td style="width:250px;">` + addVal + cityVal + pinVal + `<p>
                </td></tr>
            </table>
            <div id="v_google" style="width:250px;">` + googleLink + `Open in Google Maps</div>
        </td>
        <td id="vtable_line" style="width: 50px;"> </td>
        <td id="vtable_right" style="width: 300px;"> <div id="v_right">` + moreLink + `More events at this venue</div> <td>
    </tr>
    </table> 
    </div>
    `;

    var getven = document.getElementById('venueLink');
    getven.style.display = 'none';
    var getDiv = document.getElementById('venueDetails');
    getDiv.innerHTML = template;
    getDiv.style.display = 'block';
    if ('vimage' in data){
        var temp = document.getElementById('v_image');
        temp.style.visibility = 'visible';
    }
}

function displayEmptyVenue() {
    let template = `<div id="inner_venue" style="height: 350px;"><div style="font-size:16px;">No venue details found</div>`;
    var getven = document.getElementById('venueLink');
    getven.style.display = 'none';
    var getDiv = document.getElementById('venueDetails');
    getDiv.innerHTML = template;
    getDiv.style.display = 'block';
    
}

function displayEmpty() {
    var noRecord = document.getElementById('tmResults');
    noRecord.style.display = 'none';
    noRecord = document.getElementById('NoResults');
    noRecord.style.display = 'block';
}

function clearPage() {
    delRows();
    var getTable = document.getElementById('tmResults');
    getTable.style.display = 'none';
    var getEventView = document.getElementById('eventDetails');
    getEventView.style.display = 'none';
    var getVenueLink = document.getElementById('venueLink');
    getVenueLink.style.display = 'none';
    var getVenueView = document.getElementById('venueDetails');
    getVenueView.style.display = 'none';
    var location = document.getElementById("locInput");
    location.style.display = 'block';
    var noRecord = document.getElementById('NoResults');
    noRecord.style.display = 'none';
    var location = document.getElementById("locInput");
    location.required = true;
}