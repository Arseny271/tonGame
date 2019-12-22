#**Smart contract lottery**

Players buy any of 64 squares (or several), after a while the smart contract sets a win amount for each square.

### **Creating and working with a smart contract**
- To create a lottery smart contract, use the script **new-casino.fif** &lt;workchain-id&gt; &lt;contract-id&gt; [&lt;filename-base&gt;]

- To start a new game, use **new-game.fif** &lt;filename-base&gt; &lt;contract-id&gt; &lt;seqno&gt; &lt;square-price&gt; &lt;game-time&gt; [&lt;savefile&gt;]
	- &lt;filename-base&gt; - you lottery &lt;filename-base&gt;.addr and &lt;filename-base&gt;.pk
	- &lt;square-price&gt; - price per square
	- &lt;game-time&gt; - game time in seconds
 
 Warning! Make sure that the balance of the contract has at least &lt;square-price&gt; * 116 grams

- To buy squares, use **buy-squares.fif** &lt;filename-base&gt; &lt;game-addr&gt; &lt;seqno&gt; &lt;square-price&gt; &lt;n&gt; &lt;square-1&gt; &lt;square-2&gt; ... &lt;square-n&gt; [-S &lt;savefile&gt;]
	- &lt;filename-base&gt; - you wallet &lt;filename-base&gt;.addr and &lt;filename-base&gt;.pk
	- &lt;game-addr&gt; - lottery contract address
	- &lt;square-price&gt; - price per square
	- &lt;n&gt; - amount of squares to buy, followed by a listing of the numbers of the desired squares

- After the game has expired, as well as an additional 60 seconds, the game must be completed. Use **game-end.fif** &lt;game-addr&gt; [-S &lt;savefile&gt;]
	- &lt;game-addr&gt; - lottery contract address

- To send grams from the balance of the contract, use **wallet2.fif** &lt;filename-base&gt; &lt;dest-addr&gt; &lt;contract-id&gt; &lt;seqno&gt; &lt;amount&gt;
	- &lt;filename-base&gt; - you lottery &lt;filename-base&gt;.addr and &lt;filename-base&gt;.pk
	- &lt;dest-addr&gt; - address of the recipient
	- &lt;amount&gt; - amount to be sent
	
### **Game web client**
For the convenience of players, a web client has been created. To use it, start the server:

`cd server`

`sudo python3 server.py`

note that you will need to install the flask:

`pip3 install flask`

![](https://raw.githubusercontent.com/Arseny271/tonGame/master/screenshots/photo_2019-12-22_18-00-04.jpg)
![](https://raw.githubusercontent.com/Arseny271/tonGame/master/screenshots/image_2019-12-22_18-19-21.png)


### **Prize Determination Algorithm**
- Random 256 bit integer generated
- The number is divided by 64 4-bit integers [x<sub>0</sub>, x<sub>1</sub>, x<sub>2</sub> ... x<sub>63</sub>]
- Each square corresponds to an integer x<sub>i</sub>
- The size of the prize per square is determined by the formula: x<sup>3</sup> / 1300 * p, where p is the price of the square

a square is also determined which will receive an additional 10 * p  grams:
- Find the sum of all indices: s = x<sub>0</sub> + x<sub>1</sub> + x<sub>2</sub> ... + x<sub>63</sub>
- Winner square number is 63 - (s & 63)

Оn average, **85%** of investments are returned to players, the rest is received by the lottery owner
