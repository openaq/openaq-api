#!/bin/bash


USAGE="
Query measurements by given date and output in CSV format

Usage: ./measurements-csv.sh date-from [date-to]

Calling with one parameter would filter as exact match
and two parameters would filter as range.

Get data for today:

  ./measurements-csv.sh today

Last week:

  ./measurements-csv.sh '1 week ago' today

Last month:

  ./measurements-csv.sh '1 month ago' today
"

DATABASE="openaq-local"
COLUMNS="quote_ident(location) as location,city,country,date_utc as utc,parameter,value,unit"

if [ -n "$1" ] && [ -n "$2" ]
then
    FROM=$(date +'%Y-%m-%d' --date="$1")
    TO=$(date +'%Y-%m-%d' --date="$2")
    DATEFILTER="WHERE date_utc > '$FROM' AND date_utc < '$TO'"
elif [ -n "$1" ] && [ -z "$2"]
then
    FROM=$(date +'%Y-%m-%d' --date="$1")
    DATEFILTER="WHERE date_utc = '$FROM'"
else
    echo "$USAGE"
    exit 1
fi

SELECT_MEASUREMENTS="
  SELECT $COLUMNS
  FROM measurements
  $DATEFILTER"


psql -d $DATABASE \
    -P format=unaligned -P footer -P fieldsep=\, \
    -c "${SELECT_MEASUREMENTS}"

