import {v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@9.0.0/dist/esm-browser/index.js'

class Client{
    socket;
    responseHandlers = new Map()
    currentOrders = [];
    HTMLController;

    constructor(port){
        this.socket = new WebSocket("ws://localhost:" + port)
        this.HTMLController = new HTMLController();

        this.socket.addEventListener('open', () => {
            console.log("Websocket connected successfully")
            this.socket.addEventListener('message', (message) => this.handleIncommingMessage(JSON.parse(message.data)))
            this.socket.addEventListener('close',  (closeevent) => this.handleDisconnect(closeevent))

            this.login("admin", "admin")

            this.updateOrders();
        })
    }

    handleIncommingMessage(message){
        switch (message.type){
            case "RESPONSE":
                this.handleResponse(message.id, message.data)
                break;
            case "ERROR":
                console.log("ERROR: " + message.data.errorMessage)
                break;
            case "UPDATEORDERS":
                console.log("Recieved update request")
                this.updateOrders();
                break;
        }
    }

    handleResponse(id, data){
        if(this.responseHandlers.has(id)){
            var handler = this.responseHandlers.get(id);
            handler && handler(data)
            this.responseHandlers.delete(id)
        }
    }

    login(username, password){
        this.sendMessage(
            {
                type:"login",
                data:{
                    username:username,
                    password:password
                }
            }
        ).then((responseData) => {
            console.log(responseData.message)
        })
    }
    
    sendMessage(message){
        return new Promise((resolve) => {
            var id = uuidv4()
            this.responseHandlers.set(id, resolve)
            message.id = id;
            this.socket.send(JSON.stringify(message))
        })
    }

    updateOrders(){
        this.sendMessage(
            {
                type:"getOrders",
                data:{}
            }
        ).then((responseData) => { 
            this.currentOrders = responseData; 
            this.HTMLController.displayAllOrders(this.currentOrders);
        })
    }

    handleDisconnect(closeevent){
        console.log(closeevent)
    }
}

class HTMLController{
    fullOrderGrid;
    inProgressOrderGrid;
    completeOrderGrid;

    constructor(){
        document.addEventListener("DOMContentLoaded", () => {
            this.fullOrderGrid = document.getElementById("orders");
            this.inProgressOrderGrid = document.getElementById("in_progress");
            this.completeOrderGrid = document.getElementById("complete");
        })
    }

    addOrder(order){
        var newOrderTicket = document.createElement('div')
        newOrderTicket.classList.add("order")
        newOrderTicket.id = order.id;
        newOrderTicket.textContent = order.id;
        if(order.isReady){
            newOrderTicket.classList.add("completeOrder")
            this.completeOrderGrid.appendChild(newOrderTicket);   
        }
        else{
            newOrderTicket.classList.add("in_progressOrder")
            this.inProgressOrderGrid.appendChild(newOrderTicket);
        }
    }
    completeOrder(id){
        var orderTicket = document.querySelector("#in_progress #" + id)
        this.inProgressOrderGrid.removeChild(orderTicket)
        this.completeOrderGrid.appendChild(orderTicket)
    }
    resetGrid(){
        this.inProgressOrderGrid.innerHTML = "";
        this.completeOrderGrid.innerHTML = "";
    }

    displayAllOrders(orders){
        console.log(JSON.stringify(orders))
        this.resetGrid();
        orders.forEach(order => {
            this.addOrder(order);
        });
    }
}

var client = new Client(8080);