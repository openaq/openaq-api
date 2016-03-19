#!/usr/bin/env python
# coding: utf-8

""" https://docs.openaq.org """

from __future__ import print_function
import requests

# pylint: disable = unused-argument, wrong-import-position, wrong-import-order

URL_ROOT = 'https://api.openaq.org/v1/'

def get_api():
    """ https://docs.openaq.org """
    return requests.get('https://api.openaq.org').json()

def get_cities(country=None):
    """ https://docs.openaq.org/#api-Cities """
    return requests.get(URL_ROOT + 'cities', params=locals()).json()

def get_countries():
    """ https://docs.openaq.org/#api-Countries """
    return requests.get(URL_ROOT + 'countries').json()

def get_fetches():
    """ https://docs.openaq.org/#api-Fetches """
    return requests.get(URL_ROOT + 'fetches').json()

def get_latest(city=None, country=None, location=None, parameter=None, has_geo=None):
    """ https://docs.openaq.org/#api-Latest """
    return requests.get(URL_ROOT + 'latest', params=locals()).json()

def get_locations(city=None, country=None, location=None, parameter=None, has_geo=None):
    """ https://docs.openaq.org/#api-Locations """
    return requests.get(URL_ROOT + 'locations', params=locals()).json()

def get_measurements(city=None, country=None, location=None, parameter=None, has_geo=None,
                     value_from=None, value_to=None, date_from=None, date_to=None,
                     sort=None, order_by=None, include_fields=None,
                     limit=None, page=None, skip=None):
    """ https://docs.openaq.org/#api-Measurements """
    # pylint: disable = too-many-arguments
    return requests.get(URL_ROOT + 'measurements', params=locals()).json()


if __name__ == '__main__':
    import json
    import time
    print(json.dumps(get_api(), indent=2))
    time.sleep(1)

    #print(json.dumps(get_cities(), indent=2))
    #print(json.dumps(get_cities('US'), indent=2))
    print(json.dumps(get_cities('NL'), indent=2))
    time.sleep(1)

    print(json.dumps(get_countries(), indent=2))
    time.sleep(1)

    print(json.dumps(get_fetches(), indent=2))
    time.sleep(1)

    print(json.dumps(get_latest(parameter='PM10'), indent=2))
    #print(json.dumps(get_latest(has_geo=False), indent=2))
    time.sleep(1)

    print(json.dumps(get_measurements(country='NL'), indent=2))
