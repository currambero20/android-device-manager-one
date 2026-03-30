package io.socket.client;
public class Socket {
    public boolean connected() { return false; }
    public Socket emit(String event, Object... args) { return this; }
}
