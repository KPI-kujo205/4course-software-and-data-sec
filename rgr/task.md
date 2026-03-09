TODO:
base variant:

1. initiation by a client. create tls/ssl immitation. Client initiates the handshake sending randomly generated 'привіт' msg,
2. server's response. server responds with a randomly generated 'привіт від сервера' message, having ssl cert (.509) attached.
3. auth. client checks ssl certs of a server in a certificiation center
4. secret strings exchange. client sends secret 'premaster', which is cyphered by opens servers key. server decyphers it by its private key.

5. session keys. client and server generate sessions keys from clients and servers random strings and premaster seceret.

6. client's and server's readiness. client and server send 'ready' message, ciphered by session key.
7. handshake end. safe symmetrical handhsake is done. connection is being continued with the help of session keys.

8. extended path, root server. have your own server to check root certificates.
9. extended path, distributed topology. handshake can be done with any pair of servers.
10. extended path, pocket size limitation. add pocket size limitation to imitate slow connection.
11. extended path, Зробіть бродкаст з урахуванням обмежень топології (топологія не повнозв’язна,
    потрібно прокладати маршрути для передачі даних)
