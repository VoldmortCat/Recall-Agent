"""
ChromaDB 向量数据库客户端
用于题目向量化存储与语义搜索
对应 PRD 6.2 核心技术选型
"""

import chromadb
from chromadb.config import Settings
import os


class ChromaClient:
    """ChromaDB 客户端封装"""

    def __init__(self, persist_dir: str = "./data/chroma"):
        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False),
        )
        self.collection = None

    def get_or_create_collection(self, name: str = "mistakes"):
        """获取或创建集合"""
        try:
            self.collection = self.client.get_collection(name)
        except ValueError:
            self.collection = self.client.create_collection(name)
        return self.collection

    def add_mistake(self, mistake_id: str, text: str, metadata: dict = None):
        """添加错题向量"""
        if not self.collection:
            self.get_or_create_collection()
        self.collection.add(
            documents=[text],
            metadatas=[metadata or {}],
            ids=[mistake_id],
        )

    def search_similar(self, query: str, n_results: int = 5):
        """语义搜索相似错题"""
        if not self.collection:
            self.get_or_create_collection()
        return self.collection.query(
            query_texts=[query],
            n_results=n_results,
        )

    def delete_mistake(self, mistake_id: str):
        """删除错题向量"""
        if not self.collection:
            self.get_or_create_collection()
        self.collection.delete(ids=[mistake_id])


# 全局单例
_chroma = None


def get_chroma_client() -> ChromaClient:
    """获取 ChromaDB 客户端单例"""
    global _chroma
    if _chroma is None:
        persist_dir = os.environ.get("CHROMA_PERSIST_DIR", "./data/chroma")
        _chroma = ChromaClient(persist_dir=persist_dir)
    return _chroma