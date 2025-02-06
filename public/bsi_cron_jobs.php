<?php

namespace BSN;

use Throwable;

set_time_limit(0);
ini_set('memory_limit', -1);

$recordList = [];

$offset = null;

function getGeo( &$fields ){
  $nearestCity = isset( $fields->{'Location (Nearest City)'} ) && !empty( $fields->{'Location (Nearest City)'} ) ? $fields->{'Location (Nearest City)'} : '';
  $state = isset( $fields->State ) && !empty( $fields->State ) ?  $fields->State : '';
  $nameLocation = isset( $fields->{'Name (from Location)'}) && !empty( $fields->{'Name (from Location)'} ) ? $fields->{'Name (from Location)'} : '';
  $stateProvince = isset( $fields->{'State/Province'} ) && !empty( $fields->{'State/Province'}) ? $fields->{'State/Province'} : '';

  $geoAddress = "{$nearestCity} {$state} {$nameLocation} {$stateProvince}";
  $geoAddress = urlencode( $geoAddress );

  // echo "{$geoAddress} <br/>";

  // Set up HTTP headers
  $options = [
    'http' => [
      'header' => "Content-Type: application/json\r\n",
      'method' => 'GET'
    ]
  ];

  $context = stream_context_create( $options );
  // Make the API request
  $response = file_get_contents( "https://photon.komoot.io/api/?q={$geoAddress}", false, $context );

  // echo "response: {$response} <br/>";

    // Check if request was successful
    if ($response === false) {
      return "";
    }
  
    // Convert response to JSON
    $jsonData = json_decode($response);
    if( isset( $jsonData->features ) && count( $jsonData->features) > 0 ){

      $coordinates = $jsonData->features[0]->geometry->coordinates;
      $fields->lng = $coordinates[0];
      $fields->lat = $coordinates[1];

      // echo  "Long: {$coordinates[0]}, Lat: {$coordinates[1]} <br/>";

    } else {

    }


}

function fetchData()
{

  $offset_string = empty( $GLOBALS['offset'] ) ? '' : '&offset=' . $GLOBALS['offset'];
  // URL of the API endpoint
  $baseId = 'appixDz0HieCrwdUq';
  $tableId = 'tblYq1mA17iTZ5DRb';
  $viewId = 'viwxRN601DuNgGIhU';
  $apiUrl = "https://api.airtable.com/v0/{$baseId}/{$tableId}?view={$viewId}{$offset_string}";
  $authToken = 'pats6B5hiVXCRbkLp.1dfbd1d4e76c89ba0cbccaf5b88147d18532d144de4ee0c0192fa45fe2de25a4';

  // Set up HTTP headers
  $options = [
    'http' => [
      'header' => "Authorization: Bearer $authToken\r\n" .
        "Content-Type: application/json\r\n",
      'method' => 'GET'
    ]
  ];

  $context = stream_context_create( $options );
  // Make the API request
  $response = file_get_contents( $apiUrl, false, $context );

  // Check if request was successful
  if ($response === false) {
    die('Failed to fetch data from API');
  }

  // Convert response to JSON
  $jsonData = json_decode($response);
  if ( $jsonData === null || !isset( $jsonData->records ) ) die('Failed to parse JSON data');

  $folder = 'assets';

  foreach ( $jsonData->records as $record ) {
    $fields = $record->fields;

    try{

      

        if( isset( $fields->PHOTO ) && !empty( $fields->PHOTO) ){
          $recordId = $record->id;
          $photos = $fields->PHOTO;
          $imageType = $photos[0]->type;
          $temp= explode('/',$imageType);
          $extension = end($temp);
          $fileName = "{$folder}/{$recordId}.{$extension}";
          if (!is_dir( $folder )) mkdir( $folder, 0777, true );

          if ( empty( $photos[0]->thumbnails?->large?->url ) ) continue;
            $imageData = file_get_contents( $photos[0]->thumbnails->large->url, false, 
              stream_context_create([
                "ssl" => [
                    "verify_peer" => false,
                    "verify_peer_name" => false
                ]
              ])
            );
          
          file_put_contents( $fileName  , $imageData );
          $fields->userphoto = $fileName;


      }

      getGeo( $record->fields );


    }catch( Throwable $e ){
      error_log('error fetching image: ' . ':: ' . $e->getTraceAsString());
    }
    
  }

  $GLOBALS['recordList'] = array_merge( $GLOBALS['recordList'], $jsonData->records );


  if ( empty( $jsonData->offset ) ) return;
  else{
    $GLOBALS['offset'] = $jsonData->offset;
    fetchData();
  }

}


fetchData();

$fileName = 'api_data.json';
$jsonString = json_encode( $recordList, JSON_PRETTY_PRINT );
$byteNumber = file_put_contents($fileName, $jsonString);
unset( $jsonString );


// header('Content-Type: application/json');
// echo count( $recordList );
// echo json_encode( $recordList[0]->fields->{'Attachments (from MEMBER LEVEL)'}, JSON_PRETTY_PRINT );
// echo "Data successfully saved to $fileName";
