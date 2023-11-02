import collections
import requests
from flask import Flask, request, jsonify
from geolib import geohash


tmUrl = "https://app.ticketmaster.com/discovery/v2/events.json"
geoUrl = "https://maps.googleapis.com/maps/api/geocode/json"
gmapsUrl = "https://www.google.com/maps/search/?api=1&query="

#Insert your API keys here
googleApiKey = ""
tmApiKey = "" 


app = Flask(__name__)


@app.route('/', methods=['GET'])
def homepage():
    return app.send_static_file("event.html")


@app.route('/search', methods=['GET'])
def getDataFromClient():
    temp = request.args.get('keyword', '')
    key = temp.replace("%20", "+")
    dist = request.args.get('distance', '')
    category = request.args.get('categories', '')
    location = request.args.get('locInput', '')
    locCheck = request.args.get('locCheck', '')

    if locCheck == "on":
        lat = location.split(",")[0]
        long = location.split(",")[1]
        geoval = getGeoHash(lat, long)
    else:
        geoval = geoCoding(location)

    param = {'apikey': tmApiKey, 'keyword': key, 'radius': dist, 'unit': 'miles', 'geoPoint': geoval}
    if (category.lower() != 'default'):
        segment = getSegmentId(category)
        param['segmentId'] = segment
    result = getFunction(tmUrl, param)
    obj = extractSearchDetails(result.json())
    res = jsonify({'data': obj})
    res.headers.add("Access-Control-Allow-Origin", "*")
    res.headers.add("Access-Control-Allow-Headers", "*")
    res.headers.add("Access-Control-Allow-Methods", "*")
    return res
    


@app.route('/eventdetails')
def getEventDetails():
    id = request.args.get('eventId', '')
    tempUrl = tmUrl.replace('events.json', 'events/')
    finalUrl = tempUrl + id
    print(finalUrl)
    param = {'apikey': tmApiKey}
    result = getFunction(finalUrl, param)
    # return result.json()
    obj = extractEventDetails(result.json())
    res = jsonify({'data': obj})
    res.headers.add("Access-Control-Allow-Origin", "*")
    res.headers.add("Access-Control-Allow-Headers", "*")
    res.headers.add("Access-Control-Allow-Methods", "*")
    return res


@app.route('/venuedetails')
def getVenueDetails():
    name = request.args.get('venue', '')
    url = tmUrl.replace('events.json', 'venues')
    param = {'apikey': tmApiKey, 'keyword': name}
    result = getFunction(url, param)
    obj = extractVenueDetails(result.json())
    res = jsonify({'data': obj})
    res.headers.add("Access-Control-Allow-Origin", "*")
    res.headers.add("Access-Control-Allow-Headers", "*")
    res.headers.add("Access-Control-Allow-Methods", "*")
    return res


#given json results from ticketmaster event search API, extract useful information
def extractSearchDetails(result):
    if '_embedded' not in result or 'events' not in result['_embedded'] or len(result['_embedded']['events']) == 0:
        return ['No Results Found']
    
    details = []

    for i in range(min(20,len(result['_embedded']['events']))):
        temp = {}
        if 'dates' in result['_embedded']['events'][i] and 'start' in result['_embedded']['events'][i]['dates']:
            if 'localDate' in result['_embedded']['events'][i]['dates']['start']:
                if 'localTime' in result['_embedded']['events'][i]['dates']['start']:
                    temp['localDate'] = result['_embedded']['events'][i]['dates']['start']['localDate'] + "<br>" + result['_embedded']['events'][i]['dates']['start']['localTime']
                else:
                    temp['localDate'] = result['_embedded']['events'][i]['dates']['start']['localDate']
                

        if 'images' in result['_embedded']['events'][i] and len(result['_embedded']['events'][i]['images']) > 0 and 'url' in result['_embedded']['events'][i]['images'][0]:
            temp['image'] = result['_embedded']['events'][i]['images'][0]['url']

        if 'name' in result['_embedded']['events'][i]:
            temp['eventName'] = result['_embedded']['events'][i]['name']

        if 'classifications' in result['_embedded']['events'][i] and len(result['_embedded']['events'][i]['classifications']) > 0:
            if 'segment' in result['_embedded']['events'][i]['classifications'][0] and 'name' in result['_embedded']['events'][i]['classifications'][0]['segment']:
                temp['genre'] = result['_embedded']['events'][i]['classifications'][0]['segment']['name']

        if '_embedded' in result['_embedded']['events'][i] and 'venues' in result['_embedded']['events'][i]['_embedded']:
            if len(result['_embedded']['events'][i]['_embedded']['venues']) > 0 and 'name' in result['_embedded']['events'][i]['_embedded']['venues'][0]:
                temp['venue'] = result['_embedded']['events'][i]['_embedded']['venues'][0]['name']
        
        if 'id' in result['_embedded']['events'][i]:
            temp['eventId'] = result['_embedded']['events'][i]['id']
        
        if len(temp) > 0:
            details.append(temp)
        
    return details


def extractEventDetails(result):
    details = collections.defaultdict(str)

    if ('name' in result):
        details['name'] = result['name']
    
    if ('dates' in result) and 'start' in result['dates'] and 'localDate' in result['dates']['start']:
        if 'localTime' in result['dates']['start']:
            details['date'] = result['dates']['start']['localDate'] + " " + result['dates']['start']['localTime']
        else:
            details['date'] = result['dates']['start']['localDate']

    if ('_embedded' in result) and ('attractions' in result['_embedded']) and (len(result['_embedded']['attractions']) >0):
        if 'name' in result['_embedded']['attractions'][0]:
            details['artist'] = result['_embedded']['attractions'][0]['name']
        if 'url' in result['_embedded']['attractions'][0]:
            details['artist_url'] = result['_embedded']['attractions'][0]['url']

    if ('_embedded' in result) and ('venues' in result['_embedded']) and (len(result['_embedded']['venues']) >0):
        if 'name' in result['_embedded']['venues'][0]:
            details['venue'] = result['_embedded']['venues'][0]['name']

    genre_list = []
    if ('classifications' in result) and (len(result['classifications']) >0):
        genre_list.append(result['classifications'][0].get('subGenre', {}).get('name', 'Undefined'))
        genre_list.append(result['classifications'][0].get('genre', {}).get('name', 'Undefined'))
        genre_list.append(result['classifications'][0].get('segment', {}).get('name', 'Undefined'))
        genre_list.append(result['classifications'][0].get('subType', {}).get('name', 'Undefined'))
        genre_list.append(result['classifications'][0].get('type', {}).get('name', 'Undefined'))
    first = True
    for i in range(len(genre_list)):
        if genre_list[i] != 'Undefined':
            if first:
                details['genre'] += genre_list[i]
                first = False
            else:
                details['genre'] += ' | ' + genre_list[i]

    if ('priceRanges' in result) and len(result['priceRanges'])>0:
        details['price'] = str(result['priceRanges'][0]['min']) + '-' + str(result['priceRanges'][0]['max']) + ' USD'
    
    if 'dates' in result and 'status' in result['dates']:
        details['ticketStatus'] = ''.join(result['dates']['status']['code'].lower())

    if 'url' in result:
        details['buyUrl'] = result['url']
    if 'seatmap' in result and 'staticUrl' in result['seatmap']:
        details['seatmap'] = result['seatmap']['staticUrl']

    return details


def extractVenueDetails(result):
    if '_embedded' not in result or 'venues' not in result['_embedded'] or len(result['_embedded']['venues']) == 0:
        return ['No Results Found']

    details = {}
    if ('_embedded' in result) and ('venues' in result['_embedded']) and (len(result['_embedded']['venues']) >0):
        if 'name' in result['_embedded']['venues'][0]:
            details['name'] = result['_embedded']['venues'][0]['name']
        if 'address' in result['_embedded']['venues'][0] and 'line1' in result['_embedded']['venues'][0]['address']:
            details['address'] = result['_embedded']['venues'][0]['address']['line1']
        if 'postalCode' in result['_embedded']['venues'][0]:
            details['pincode'] = result['_embedded']['venues'][0]['postalCode']
        if 'url' in result['_embedded']['venues'][0]:
            details['upcoming'] = result['_embedded']['venues'][0]['url']
        if ('city' in result['_embedded']['venues'][0]) and ('name' in result['_embedded']['venues'][0]['city']):
            if ('state' in result['_embedded']['venues'][0]) and ('stateCode' in result['_embedded']['venues'][0]['state']):
                details['city'] = result['_embedded']['venues'][0]['city']['name'] + ', ' + result['_embedded']['venues'][0]['state']['stateCode']
            else:
                details['city'] = result['_embedded']['venues'][0]['city']['name']
        if ('images' in result['_embedded']['venues'][0]) and len(result['_embedded']['venues'][0]['images'])>0:
            if ('url' in result['_embedded']['venues'][0]['images'][0]):
                details['vimage'] = result['_embedded']['venues'][0]['images'][0]['url']
    temp = ""
    if 'name' in details:
        temp = details['name']
    if 'address' in details:
        temp += '%2C+' + details['address'] 
    if 'city' in details:
        temp += '%2C+' + details['city'] 
    if 'pincode' in details:
        temp += '%2C+' + details['pincode']
    full = temp.replace(' ', '+')
    details['googleLink'] = gmapsUrl + full.replace(',', '%2C')

    return details

#make a get request
def getFunction(url, param):
    result = requests.get(url, params=param, headers={'Content-Type': 'application/json'})
    if result.status_code == 200:
        return result
    return str(result.status_code)


def getSegmentId(category):
    lookup = {'music': 'KZFzniwnSyZfZ7v7nJ', 'sports': 'KZFzniwnSyZfZ7v7nE', 'arts': 'KZFzniwnSyZfZ7v7na', 
    'theatre': 'KZFzniwnSyZfZ7v7na', 'film': 'KZFzniwnSyZfZ7v7nn', 'miscellaneous': 'KZFzniwnSyZfZ7v7n1'}

    return lookup[category.lower()]


#call google geocoding api and then hashcode the lat, long retieved
def geoCoding(location):
    try:
        temp = location.replace("%20", "+")
        param = {'key': googleApiKey, 'address': temp}
        result = getFunction(geoUrl, param)
        res = result.json()
        lat = res['results'][0]['geometry']['location']['lat']
        long = res['results'][0]['geometry']['location']['lng']
        res =  getGeoHash(lat, long)
    except:
        res = ""
    
    return res
    


def getGeoHash(lat, long):
    return geohash.encode(lat, long, 5)


if __name__ == "__main__":
    app.run(debug = True)

    