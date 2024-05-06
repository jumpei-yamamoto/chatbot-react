from llama_index.llms.ollama import Ollama
from llama_parse import LlamaParse
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, PromptTemplate
from llama_index.core.embeddings import resolve_embed_model
from dotenv import load_dotenv

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) 


@app.route('/process', methods=['POST'])
def process_request():
    data = request.json
    load_dotenv()

    llm = Ollama(
        model = "phi3",
        request_timeout = 60.0,
    )

    parser = LlamaParse(result_type="markdown")

    file_extractor = {".docx": parser}
    documents = SimpleDirectoryReader("./data", file_extractor=file_extractor).load_data()

    embed_model = resolve_embed_model("local:BAAI/bge-m3")
    vecotor_index = VectorStoreIndex.from_documents(documents, embed_model=embed_model)
    query_engine = vecotor_index.as_query_engine(llm=llm)

    result = query_engine.query(data.get("query"))
    print(result)

    if result:
        return jsonify({'result': str(result)})
    else:
        return jsonify({'error': 'No result found'}), 404

if __name__ == '__main__':
    app.run(debug=True, host='localhost', port=5000)

