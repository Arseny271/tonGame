from flask import Flask, request, render_template, jsonify
import requests
import tonlib


tonlib = tonlib.TonlibJSON("./libtonlibjson.so.0.5", "ton-lite-client-test1.config.json")

app = Flask(__name__)

@app.route('/')
def hello_world():
    return render_template('index.html')

@app.route('/sendboc')
def send_boc():
    data = request.args.get("data")
    if (data):
        return jsonify(tonlib.send({
            "@type": "raw.sendMessage",
            "body": data
        }))
    else:
        return jsonify({"status": "error"})

@app.route('/getAccount')
def get_account():
    data = request.args.get("address")
    if (data):
        return jsonify(tonlib.send({
            "@type": "raw.getAccountState",
            "account_address": {
                "account_address": data
            }
        }))
    else:
        return jsonify({"status": "error"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
