<?php
header('Content-type: audio/mpeg');
if(isset($_GET['url'])){
	$daurl = urldecode($_GET['url']);
	$handle = fopen($daurl, "r");
	if ($handle) {
	    while (!feof($handle)) {
	        $buffer = fgets($handle, 4096);
	        echo $buffer;
	    }
	    fclose($handle);
	}
}

