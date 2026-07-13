from gradio_client import Client
client = Client("http://localhost:5000/")
print(client.endpoints)
