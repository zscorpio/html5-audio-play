<?php
	include("snoopy.php");
	$send_snoopy = new Snoopy; 
	$submit = urldecode($_GET["url"])."?";
	if(isset($_GET["url"])){
		unset($_GET["url"]);
	}
	$get = array();
	foreach ($_GET as $key => $value) {
		array_push($get, $key."=".$value);
	}
	$submit.= implode("&",$get);
	$send_snoopy->submit($submit,$_POST);
	echo $send_snoopy->results;