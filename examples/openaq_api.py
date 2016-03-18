#!/usr/bin/env python
# coding: utf-8

""" https://docs.openaq.org """

import requests

URL_ROOT = 'https://api.openaq.org/v1/'
VALID_PARAMETERS = 'pm25 pm10 so2 no2 o3 co bc'.split()

def get_api():
    """ https://docs.openaq.org """
    return requests.get('https://api.openaq.org').json()

def get_cities(country=None):
    """ https://docs.openaq.org/#api-Cities """
    payload = {'country': country}
    return requests.get(URL_ROOT + 'cities', params=payload).json()

def get_countries():
    """ https://docs.openaq.org/#api-Countries """
    return requests.get(URL_ROOT + 'countries').json()

def get_fetches():
    """ https://docs.openaq.org/#api-Fetches """
    return requests.get(URL_ROOT + 'fetches').json()

def get_latest(city=None, country=None, location=None, parameter=None, has_geo=None):
    """ https://docs.openaq.org/#api-Latest """
    if parameter:
        parameter = parameter.lower()
    assert parameter in VALID_PARAMETERS
    payload = {'city': city, 'country': country, 'location': location,
               'parameter': parameter, 'has_geo': has_geo}
    return requests.get(URL_ROOT + 'latest', params=payload).json()

def get_locations(city=None, country=None, location=None, parameter=None, has_geo=None):
    """ https://docs.openaq.org/#api-Locations """
    if parameter:
        parameter = parameter.lower()
    assert parameter in VALID_PARAMETERS
    payload = {'city': city, 'country': country, 'location': location,
               'parameter': parameter, 'has_geo': has_geo}
    return requests.get(URL_ROOT + 'locations', params=payload).json()

def get_measurements(city=None, country=None, location=None, parameter=None, has_geo=None,
                     value_from=None, value_to=None, date_from=None, date_to=None,
                     sort_=None, order_by=None, include_fields=None,
                     limit=None, page=None, skip=None):
    """ https://docs.openaq.org/#api-Measurements """
    if parameter:
        parameter = parameter.lower()
        assert parameter in VALID_PARAMETERS
    else:  # value_from and value_to can only be used with a parameter
        assert not value_from and not value_to
    for date in (date_from, date_to):
        assert date is None or date.count('-') == 2
    if sort_:
        sort_ = sort_.lower()
        assert sort_ in ('asc', 'desc')
    assert include_fields  in (None, 'attribution', 'averagingPeriod', 'sourceName')
    payload = {'city': city, 'country': country, 'location': location,
               'parameter': parameter, 'has_geo': has_geo,
               'value_from': value_from, 'value_to': value_to,
               'date_from': date_from, 'date_to': date_to, 'sort': sort_,
               'order_by': order_by, 'include_fields': include_fields,
               'limit': limit, 'page': page, 'skip': skip}
    return requests.get(URL_ROOT + 'measurements', params=payload).json()


if __name__ == '__main__':
    import json
    #print(json.dumps(get_api(), indent=2))

    #print(json.dumps(get_cities(), indent=2))
    #print(json.dumps(get_cities('US'), indent=2))
    #print(json.dumps(get_cities('NL'), indent=2))

    #print(json.dumps(get_countries(), indent=2))

    #print(json.dumps(get_fetches(), indent=2))

    #print(json.dumps(get_latest(parameter='PM10'), indent=2))
    #print(json.dumps(get_latest(has_geo=False), indent=2))

    print(json.dumps(get_measurements(country='NL'), indent=2))
