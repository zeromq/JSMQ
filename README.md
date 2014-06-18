JSMQ
====

JSMQ is javascript client for ZeroMQ/NetMQ over WebSockets.

ZeroMQ and NetMQ don't have a WebSockets transport at the moment, however there is a [WebSocket extension to NetMQ](https://github.com/somdoron/NetMQ.WebSockets), hopefully soon it will be integrated to the library.

For browser without WebSockets support ([RFC6455](http://tools.ietf.org/html/rfc6455)) you can try to use [web-socket-js](https://github.com/gimite/web-socket-js).

Both JSMQ and NetMQ WebSockets are beta at the moment and the API and protocol will probably changed.

The JSMQ currently only implement the dealer pattern and the NetMQ WebSockets only implement the router pattern, but we can start work with that.

Using JSMQ is very similar to using other high level binding of ZeroMQ, download the JSMQ.js from the github page. Following is small example:

```html
<html>
	<script src="JSMQ.js" />	
	<script>
		var dealer = new Dealer();		
		
		// send ready will be raised when at least when socket got connected, 
		// if you try to send a message before the event the message will be dropped
		// the event will raised again only if the send method return false.		
		dealer.sendReady = function(socket) { 				
			alert("ready to send");
		   };
		
		// receive ready will be raised when there is message ready to be received, 
		// trying to receive message before this event will get you a null message
		// the event will be raised again only if you received null message, 
		// therefore every time the event is triggered you must conumse all the messages
		dealer.receiveReady = function(socket) {		
			var message = dealer.receive();
		
			while(message!=null)
			{				
				alert(message);
				message = dealer.receive();
			}
		};
	
		// connecting to multiple address, 
		// like regular zeromq dealer will round robin between the sockets
		dealer.connect("ws://localhost:80");		
		dealer.connect("ws://localhost:81");		
		
		function send()
		{
			// send a message to the zeromq server
			dealer.send("hello");
		}		
	</script>
	
	<body>
		<button  onclick="javascript: send()" >Send</button>			
	</body>
</html>
```



