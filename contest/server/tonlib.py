from ctypes import CDLL, c_void_p, c_char_p, c_double
import json, time

class TonlibJSON:
    def __init__(self, tonlib_path, config_path):
        tonlib = CDLL(tonlib_path)

        tonlib_json_client_create = tonlib.tonlib_client_json_create
        tonlib_json_client_create.restype = c_void_p
        tonlib_json_client_create.argtypes = []
        self._client = tonlib_json_client_create()

        tonlib_json_client_receive = tonlib.tonlib_client_json_receive
        tonlib_json_client_receive.restype = c_char_p
        tonlib_json_client_receive.argtypes = [c_void_p, c_double]
        self._tonlib_json_client_receive = tonlib_json_client_receive

        tonlib_json_client_send = tonlib.tonlib_client_json_send
        tonlib_json_client_send.restype = None
        tonlib_json_client_send.argtypes = [c_void_p, c_char_p]
        self._tonlib_json_client_send = tonlib_json_client_send

        tonlib_json_client_execute = tonlib.tonlib_client_json_execute
        tonlib_json_client_execute.restype = c_char_p
        tonlib_json_client_execute.argtypes = [c_void_p, c_char_p]
        self._tonlib_json_client_execute = tonlib_json_client_execute

        tonlib_json_client_destroy = tonlib.tonlib_client_json_destroy
        tonlib_json_client_destroy.restype = None
        tonlib_json_client_destroy.argtypes = [c_void_p]
        self._tonlib_json_client_destroy = tonlib_json_client_destroy

        with open(config_path, "r") as read_file:
            config_json = json.load(read_file)

        self.send({"@type":"init", 'options': {
            '@type': 'options',
            'config': {
                '@type': 'config',
                'config': json.dumps(config_json)
            },
            'keystore_type': {
                '@type': 'keyStoreTypeDirectory',
                'directory': "./test.keys"
            }
        }})

    def __del__(self):
        self._tonlib_json_client_destroy(self._client)

    def send(self, query):
        unhidden_query = json.dumps(query).encode('utf-8')

        self._tonlib_json_client_send(self._client, unhidden_query)
        return self.receive()
        #result = self._tonlib_json_client_receive(self._client, 30.0)
        #print("\033[34m\033[1m", result, "\033[0m")
        #if result:
        #    result = json.loads(result.decode('utf-8'))
        #    if (result["@type"] == "updateSyncState"):
        #        #print("\033[34m\033[1m", "Жопа", "\033[0m")
        #        print("\033[34m\033[1m", "Жопа",
        #            self._tonlib_json_client_receive(self._client, 30.0))
        #        return self.send(query)


        return result

    def receive(self):
        result = self._tonlib_json_client_receive(self._client, 30.0)
        if result:
            result = json.loads(result.decode('utf-8'))
            if (result["@type"] == "updateSyncState"):
                return self.receive()
        print("\033[34m\033[1m", result, "\033[0m")
        return result
