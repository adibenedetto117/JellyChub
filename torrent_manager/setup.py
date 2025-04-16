from setuptools import setup, find_packages

setup(
    name="torrent_manager",
    version="0.1.0",
    description="A web-based torrent download manager",
    author="Your Name",
    packages=find_packages(),
    install_requires=[
        "flask>=2.0.1",
        "python-libtorrent>=2.0.5",  # Use appropriate version for your OS
        "waitress>=2.0.0",  # For production deployment
    ],
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: End Users/Desktop",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
    ],
    python_requires=">=3.7",
)